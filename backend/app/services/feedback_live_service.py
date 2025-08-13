from google import genai
from google.genai import types
import json
import logging
from app.services.supabase_service import SupabaseService
import httpx
import tempfile, base64, os, io, asyncio
from datetime import datetime, timezone
import traceback
import json5
import re
from typing import Dict, List, Any

# Initialize the Gemini client
genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"  # For text-only analysis
MULTIMODAL_MODEL = "gemini-2.5-pro"  # For audio analysis

# Prompt for the single-call multimodal path
LIVE_BATCH_PROMPT = """
You are an expert interviewer and feedback analyst. Your task is to provide comprehensive and actionable feedback for a candidate's mock interview performance based on the attached audio responses to the listed questions.

Job Context:
- Resume: {resume}
- Job Title: {job_title}
- Job Description: {job_description}
- Company: {company_name}

Instructions:
- For each interview question and the immediately following audio clip, first transcribe the response verbatim.
- Then provide detailed feedback that covers both content and delivery (tone, pace, confidence, clarity, enthusiasm).
- Return a single JSON object using this schema:
{{
  "question_analysis": [
    {{
      "question": "The interview question",
      "transcript": "Verbatim transcription from the audio",
      "delivery_analysis": "Analysis of vocal tone, pacing, confidence, clarity, enthusiasm, and professionalism",
      "feedback": {{
        "strengths": ["Specific strength 1", "Specific strength 2"],
        "areas_for_improvement": ["Area 1", "Area 2"],
        "tips_for_improvement": ["Actionable tip 1", "Actionable tip 2"]
      }},
      "tone_and_style": "Concise assessment of tone and communication style"
    }}
  ],
  "overall_feedback_summary": ["Key strength", "Key improvement area"],
  "communication_assessment": ["Observation 1", "Observation 2"],
  "delivery_feedback": ["Vocal delivery insight 1", "Speaking style insight 2"],
  "overall_sentiment": "Positive/Neutral/Negative",
  "confidence_score": 7,
  "overall_improvement_steps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}}
"""

# In-memory tracker for feedback generation status
feedback_status = {}

AUDIO_ANALYSIS_PROMPT = """
Analyze this audio response to an interview question. Focus on:
1. Tone of voice, confidence level, and clarity
2. Speaking pace, pauses, and verbal tics
3. Level of enthusiasm and engagement
4. Evidence of preparation and thoughtfulness
5. Professional communication style

The question was: "{question}"

Provide your analysis focusing specifically on HOW the candidate spoke (not just what they said).
"""

LIVE_FEEDBACK_PROMPT_TEMPLATE = """
You are an expert interviewer and feedback analyst. Your task is to provide comprehensive and actionable feedback for a candidate's mock interview performance based on both the transcript and audio analysis.

Job Context:
- Resume: {resume}
- Job Title: {job_title}
- Job Description: {job_description}
- Company: {company_name}

Interview Transcript:
{transcript}

Audio Analysis:
{audio_analysis}

Instructions for Analysis:
Based on the full transcript and audio analysis, provide detailed feedback on the candidate's performance including:

1. Question-Specific Feedback:
   - For each interview question, analyze both the content and delivery of the candidate's response
   - Identify strengths in their answer and delivery style
   - Identify areas for improvement in both content and communication
   - Provide actionable tips to enhance their answers and delivery

2. Overall Assessment:
   - Evaluate overall communication skills, clarity, confidence, and professionalism
   - Assess voice tone, pacing, and emotional connection
   - Evaluate how well they addressed questions and provided relevant examples

Return your analysis as a structured JSON object using the following format:

{{
  "question_analysis": [
    {{
      "question": "The interview question that was asked",
      "transcript": "The candidate's response transcribed",
      "delivery_analysis": "Analysis of vocal tone, pacing, confidence, etc.",
      "feedback": {{
        "strengths": ["Specific strength 1", "Specific strength 2"],
        "areas_for_improvement": ["Area to improve 1", "Area to improve 2"],
        "tips_for_improvement": ["Actionable tip 1", "Actionable tip 2"]
      }},
      "tone_and_style": "Assessment of tone, delivery, and communication style"
    }}
  ],
  "overall_feedback_summary": ["Key strength 1", "Key improvement area 1", "Key insight 3"],
  "communication_assessment": ["Communication observation 1", "Communication observation 2"],
  "delivery_feedback": ["Vocal delivery insight 1", "Speaking style insight 2", "Non-verbal communication insight 3"],
  "overall_sentiment": "Positive/Neutral/Negative",
  "confidence_score": 7,
  "overall_improvement_steps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}}

The confidence_score should be an integer from 1-10 where 10 represents exceptional interview performance.
"""

class FeedbackLiveService:
    @staticmethod
    async def repair_json(json_text, error_message=None):
        """JSON repair function for handling malformed JSON from Gemini"""
        try:
            # Remove markdown code blocks
            text = re.sub(r'```json|```', '', json_text).strip()
            
            # Fix unterminated strings - look for pattern of quoted string without closing quote
            # Common at the end of files or before another field starts
            text = re.sub(r'"([^"]*?)(?=\n\s*")', r'"\1"', text)
            text = re.sub(r'"([^"]*?)$', r'"\1"', text)  # Fix unterminated string at end of text
            
            # Fix missing quotes, commas, and other common issues
            text = re.sub(r'": "([^"\n]*)(?=\n\s*")', '": "\\1"', text)
            text = re.sub(r'": "([^"\n]*)(?=\n\s*})', '": "\\1"', text)
            text = re.sub(r'([^"])\s*,\s*"', '\\1",\n"', text)
            
            # Handle cases with triple quotes which often break parsing
            text = re.sub(r'"""', '"', text)  # Replace triple quotes with single quotes
            
            # Try parsing with json5 (more forgiving JSON parser)
            try:
                return json5.loads(text)
            except Exception:
                # If json5 fails, try balancing quotes
                text = FeedbackLiveService.balance_quotes(text)
                return json5.loads(text)
                
        except Exception as e:
            logging.error(f"All JSON repair strategies failed: {str(e)}")
            
            # Create a minimal valid structure as fallback when all else fails
            return {
                "question_analysis": [{
                    "question": "Interview question", 
                    "transcript": "Response could not be transcribed correctly",
                    "delivery_analysis": "Could not analyze delivery due to JSON parsing issues",
                    "feedback": {
                        "strengths": ["Unable to analyze strengths due to technical issues"],
                        "areas_for_improvement": ["Try again with clearer audio"],
                        "tips_for_improvement": ["Consider using text responses if audio issues persist"]
                    },
                    "tone_and_style": "Could not analyze"
                }],
                "overall_feedback_summary": ["Unable to generate complete feedback due to technical issues"],
                "communication_assessment": ["Assessment unavailable due to processing error"],
                "delivery_feedback": ["Feedback unavailable due to processing error"],
                "overall_sentiment": "Neutral",
                "confidence_score": 5,
                "overall_improvement_steps": ["Try the interview again for better feedback"]
            }

    @staticmethod
    def balance_quotes(text):
        """Balance quotes in JSON fields"""
        pattern = r'"([^"]+)":\s*"([^"]*)'
        
        def replacer(match):
            field, value = match.groups()
            return f'"{field}": "{value}"'
            
        return re.sub(pattern, replacer, text)

    @staticmethod
    async def process_audio_for_transcription(audio_url: str):
        try:
            if not audio_url:
                return None

            # Normalize
            audio_url = SupabaseService.normalize_public_url(audio_url)
            logging.info(f"Processing audio from URL: {audio_url}")

            async with httpx.AsyncClient() as http:
                resp = await http.get(audio_url)
                if resp.status_code != 200:
                    logging.error(f"Failed to download audio (public URL). HTTP {resp}")
                    # Try re-signing the stored URL (works if bucket is private)
                    signed = SupabaseService.to_signed_url_from_public_url(audio_url, expires_in=60 * 60)
                    if signed:
                        logging.info(f"Retrying with signed URL")
                        resp = await http.get(signed)
                if resp.status_code != 200:
                    logging.error(f"Failed to download audio after retry. HTTP {resp}")
                    return None

                audio_data = resp.content
            
            # Use Gemini for audio transcription if the file is not too large
            if len(audio_data) < 10 * 1024 * 1024:  # Less than 10MB
                try:
                    # Create a temporary file for the audio
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                        temp_file.write(audio_data)
                        temp_path = temp_file.name
                    
                    # Encode the audio file as base64
                    with open(temp_path, "rb") as audio_file:
                        audio_bytes = audio_file.read()
                        audio_b64 = base64.b64encode(audio_bytes).decode()
                    
                    # Clean up the temporary file
                    os.unlink(temp_path)
                    
                    # Call Gemini's multimodal endpoint for transcription
                    response = genai_client.models.generate_content(
                        model=MULTIMODAL_MODEL,
                        contents=[
                            {"role": "user", "parts": [
                                {"text": "Please transcribe the following audio accurately. Only provide the transcription text, no other commentary."},
                                {"inline_data": {"mime_type": "audio/wav","data": audio_b64}}
                            ]}
                        ]
                    )
                    
                    if response and hasattr(response, "candidates") and response.candidates:
                        transcript = response.candidates[0].content.parts[0].text
                        # Clean up any markdown formatting or prefixes
                        transcript = re.sub(r'^"?Transcription:?\s*|"$', '', transcript.strip())
                        return transcript
                except Exception as e:
                    logging.error(f"Error transcribing audio with Gemini: {e}")
                    return None
            
            # If we got here, we either couldn't transcribe or the file was too large
            return "[Audio content available but not transcribed]"
        
        except Exception as e:
            logging.error(f"Error processing audio: {e}")
            return None

    @staticmethod
    async def analyze_audio_delivery(audio_url: str, question: str):
        try:
            if not audio_url:
                return None

            audio_url = SupabaseService.normalize_public_url(audio_url)
            logging.info(f"Analyzing audio delivery from URL: {audio_url}")

            async with httpx.AsyncClient() as http:
                resp = await http.get(audio_url)
                if resp.status_code != 200:
                    logging.error(f"Failed to download audio (public URL). HTTP {resp}")
                    signed = SupabaseService.to_signed_url_from_public_url(audio_url, expires_in=60 * 60)
                    if signed:
                        logging.info(f"Retrying with signed URL")
                        resp = await http.get(signed)
                if resp.status_code != 200:
                    logging.error(f"Failed to download audio after retry. HTTP {resp}")
                    return None

                audio_data = resp.content
            
            # Check if file is too large (Gemini has limits)
            if len(audio_data) > 10 * 1024 * 1024:  # 10MB
                logging.warning(f"Audio file too large ({len(audio_data)/1024/1024:.2f}MB) for delivery analysis")
                return "Audio file too large for analysis"

            # Create a temporary file for the audio
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            # Encode the audio file as base64
            with open(temp_path, "rb") as audio_file:
                audio_bytes = audio_file.read()
                audio_b64 = base64.b64encode(audio_bytes).decode()
            
            # Clean up the temporary file
            os.unlink(temp_path)
            
            # Prepare prompt with the question context
            prompt = AUDIO_ANALYSIS_PROMPT.format(question=question)
            
            # Call Gemini's multimodal model to analyze audio
            response = genai_client.models.generate_content(
                 model=MULTIMODAL_MODEL,
                 contents=[{"role":"user","parts":[{"text": prompt},{"inline_data":{"mime_type":"audio/wav","data": audio_b64}}]}],
                 config={"max_output_tokens": 1024,"temperature": 0.2}
             )
            
            # Improved error handling
            if not response:
                return "No response received from Gemini API"
            if not hasattr(response, "candidates") or not response.candidates:
                return "No candidate responses from Gemini API"
            if not hasattr(response.candidates[0], "content") or not response.candidates[0].content:
                return "Empty content in Gemini API response"
            if not hasattr(response.candidates[0].content, "parts") or not response.candidates[0].content.parts:
                return "No content parts in Gemini API response"
                
            analysis = response.candidates[0].content.parts[0].text
            return analysis
            
        except Exception as e:
            logging.error(f"Error analyzing audio delivery: {e}")
            return f"Error analyzing audio: {str(e)[:100]}"

    @staticmethod
    async def extract_question_answer_pairs(conversation_turns):
        """Extract question-answer pairs from conversation turns"""
        questions = []
        current_question = None
        current_answer = ""
        
        for turn in conversation_turns:
            if turn['speaker'] == 'ai' and turn.get('text_content'):
                # If there was a previous Q&A pair, add it to the list
                if current_question and current_answer:
                    questions.append({
                        "question": current_question,
                        "answer": current_answer
                    })
                
                # Start a new question
                current_question = turn.get('text_content', '')
                current_answer = ""
            elif turn['speaker'] == 'user' and turn.get('text_content'):
                # Add to the current answer
                current_answer += " " + turn.get('text_content', '')
        
        # Add the final Q&A pair if exists
        if current_question and current_answer:
            questions.append({
                "question": current_question,
                "answer": current_answer
            })
            
        return questions

    @staticmethod
    async def _upload_audio_to_gemini(audio_url: str, display_name: str, interview_id: str) -> str:
        """
        Downloads audio (re-signing Supabase URLs if needed) and uploads to Gemini Files.
        Returns the Gemini file name (for file_uri) or empty string on failure.
        """
        if not audio_url:
            return ""
        # Normalize and fetch bytes (reuse existing retry/sign flow)
        audio_url = SupabaseService.normalize_public_url(audio_url)
        try:
            async with httpx.AsyncClient() as http:
                resp = await http.get(audio_url)
                if resp.status_code != 200:
                    signed = SupabaseService.to_signed_url_from_public_url(audio_url, expires_in=60 * 60)
                    if signed:
                        resp = await http.get(signed)
                if resp.status_code != 200:
                    logging.error(f"Gemini upload skipped; audio download failed: HTTP {resp}")
                    return ""
                audio_bytes = resp.content
        except Exception as e:
            logging.error(f"Failed to download for Gemini upload: {e}")
            return ""

        # Guess MIME from extension (most live files are wav)
        mime = "audio/wav"
        lower = audio_url.lower()
        if lower.endswith(".webm"):
            mime = "audio/webm"
        elif lower.endswith(".mp3"):
            mime = "audio/mpeg"
        elif lower.endswith(".m4a"):
            mime = "audio/m4a"
        elif lower.endswith(".wav"):
            mime = "audio/wav"

        # Upload to Gemini Files
        try:
            stream = io.BytesIO(audio_bytes)
            stream.name = display_name
            # Fix: Create a valid Gemini file name (only lowercase alphanumeric chars and dashes)
            # Remove dots, underscores, spaces and other invalid characters
            clean_name = re.sub(r'[^a-z0-9-]', '', f"{interview_id[:8]}-answer-{display_name.replace('.wav', '').replace('_', '')}")
            gem_file = genai_client.files.upload(
                file=stream,
                config=types.UploadFileConfig(
                    mime_type=mime,
                    name=clean_name,  # Use cleaned name
                    display_name=display_name
                )
            )
            if hasattr(gem_file, "name") and gem_file.name:
                return gem_file.name
            logging.error("Gemini file upload returned no name")
            return ""
        except Exception as e:
            logging.error(f"Gemini file upload failed: {e}")
            return ""

    @staticmethod
    async def generate_live_feedback(interview_id: str, user_id: str):
        """
        Generates holistic feedback for a live interview by analyzing both
        transcript content and audio delivery.
        """
        try:
            logging.info(f"Starting live feedback generation for interview {interview_id}")
            
            # 1. Fetch all necessary data
            interview_data = await SupabaseService.get_interview_data(user_id, interview_id)
            if not interview_data:
                raise Exception(f"Failed to retrieve interview data for interview {interview_id}")
            
            conversation_turns = await SupabaseService.get_all_conversation_turns(interview_id)
            if not conversation_turns:
                logging.warning(f"No conversation turns found in database for interview {interview_id}. Checking for user responses...")
                # Fallback logic for user_responses (keep this part unchanged)
                user_responses = SupabaseService.get_user_responses(interview_id)
                if user_responses:
                    # Create synthetic conversation turns from user_responses (keep this part unchanged)
                    # ...existing code to create conversation_turns from user_responses...
                    conversation_turns = []
                    for i, response in enumerate(user_responses):
                        # Get the question
                        question_id = response.get("question_id")
                        question_data = SupabaseService.get_interview_question(question_id)
                        
                        if question_data:
                            # Add synthetic AI turn (question)
                            conversation_turns.append({
                                "speaker": "ai",
                                "text_content": question_data.get("question", "Unknown question"),
                                "turn_index": i * 2,
                                "audio_url": None
                            })
                            
                            # Add synthetic user turn (answer)
                            conversation_turns.append({
                                "speaker": "user", 
                                "text_content": response.get("transcription", ""),
                                "turn_index": i * 2 + 1,
                                "audio_url": response.get("audio_url")
                            })
                else:
                    raise Exception(f"No conversation turns or user responses found for interview {interview_id}")
            
            logging.info(f"Retrieved {len(conversation_turns)} conversation turns")
            conversation_turns.sort(key=lambda x: x.get('turn_index', 0))

            # Build Q&A pairs (AI question -> user answer)
            qa_pairs = []
            current_question = None
            current_question_turn = None
            current_answer = None
            current_answer_turn = None
            
            for turn in conversation_turns:
                if turn.get('speaker') == 'ai' and turn.get('text_content'):
                    if current_question and current_answer:
                        qa_pairs.append({
                            "question": current_question,
                            "question_turn": current_question_turn,
                            "answer": current_answer,
                            "answer_turn": current_answer_turn
                        })
                    current_question = turn.get('text_content')
                    current_question_turn = turn
                    current_answer = None
                    current_answer_turn = None
                elif turn.get('speaker') == 'user' and current_question and not current_answer:
                    current_answer = turn.get('text_content', '')
                    current_answer_turn = turn
            
            if current_question and current_answer:
                qa_pairs.append({
                    "question": current_question,
                    "question_turn": current_question_turn,
                    "answer": current_answer,
                    "answer_turn": current_answer_turn
                })
            
            logging.info(f"Built {len(qa_pairs)} question-answer pairs")

            # APPROACH 1: Single-call multimodal path — send all audio files at once
            gemini_items = []
            for idx, pair in enumerate(qa_pairs):
                answer_turn = pair.get("answer_turn") or {}
                audio_url = answer_turn.get("audio_url")
                if not audio_url:
                    continue
                q_text = pair.get("question", f"Question {idx+1}")
                display_name = f"live_answer_{idx+1}.wav"
                file_name = await FeedbackLiveService._upload_audio_to_gemini(audio_url, display_name, interview_id)
                if file_name:
                    gemini_items.append({"question": q_text, "file_name": file_name})
            
            logging.info(f"Prepared {len(gemini_items)} audio files for multimodal API")

            if gemini_items:
                # Build the prompt and contents for a single multimodal call
                resume_text = interview_data.get('resume', {}).get('extracted_text', '') or "Not provided"
                job_title = (interview_data.get('job_description', {}) or {}).get('title', '') or "Not specified"
                job_description = (interview_data.get('job_description', {}) or {}).get('description', '') or "Not provided"
                company_name = interview_data.get('company_name', '') or "Not specified"

                prompt_text = LIVE_BATCH_PROMPT.format(
                    resume=resume_text[:2000],
                    job_title=job_title,
                    job_description=job_description[:2000],
                    company_name=company_name
                )

                contents = [{"role": "user", "parts": [{"text": prompt_text}]}]
                for item in gemini_items:
                    # Add the question and the Gemini file reference
                    contents[0]["parts"].append({"text": f"\nInterview Question: {item['question']}"})
                    contents[0]["parts"].append({
                        "file_data": {
                            "file_uri": f"https://generativelanguage.googleapis.com/v1beta/{item['file_name']}",
                            "mime_type": "audio/wav"
                        }
                    })

                # Call multimodal model once with retry logic for rate limits
                retries = 3
                last_err = None
                
                for attempt in range(1, retries + 1):
                    try:
                        logging.info(f"Making single multimodal call to Gemini (attempt {attempt}/{retries})")
                        api_response = genai_client.models.generate_content(
                            model=MULTIMODAL_MODEL,
                            contents=contents,
                            config={
                                "max_output_tokens": 4096,
                                "temperature": 0.3,
                                "response_mime_type": "application/json"
                            }
                        )
                        
                        if not api_response or not getattr(api_response, "candidates", None):
                            raise Exception("Empty response from Gemini API")
                        
                        feedback_text = api_response.candidates[0].content.parts[0].text
                        if feedback_text.startswith("```json"):
                            feedback_text = feedback_text[7:]
                        if feedback_text.endswith("```"):
                            feedback_text = feedback_text[:-3]
                        
                        try:
                            feedback_data = json.loads(feedback_text)
                        except json.JSONDecodeError as e:
                            logging.warning(f"JSON parsing failed: {str(e)}. Attempting repair...")
                            feedback_data = await FeedbackLiveService.repair_json(feedback_text, str(e))

                        # Save feedback and update interview status
                        db_feedback_payload = {
                            "interview_id": interview_id,
                            "user_id": user_id,
                            "feedback_data": feedback_data,
                            "status": "completed",
                        }
                        
                        feedback_result = await SupabaseService.save_feedback(db_feedback_payload)
                        if isinstance(feedback_result, dict) and feedback_result.get("error"):
                            error_detail = feedback_result["error"].get("message", str(feedback_result["error"]))
                            raise Exception(f"Failed to save feedback to database: {error_detail}")

                        logging.info(f"Saved feedback to database for interview {interview_id}")

                        # Compute score and update interview
                        score = None
                        if "confidence_score" in feedback_data:
                            confidence_score = feedback_data.get("confidence_score", 5)
                            score = min(100, max(0, int(confidence_score) * 10))
                        
                        created_at_str = interview_data.get("created_at")
                        completed_at_dt = datetime.now(timezone.utc)
                        duration_str = "N/A"
                        
                        if created_at_str:
                            try:
                                created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                                duration_seconds = (completed_at_dt - created_at_dt).total_seconds()
                                duration_minutes = round(duration_seconds / 60)
                                duration_str = "< 1 minute" if duration_minutes < 1 else ("1 minute" if duration_minutes == 1 else f"{duration_minutes} minutes")
                            except (ValueError, TypeError) as e:
                                logging.warning(f"Could not parse created_at '{created_at_str}': {str(e)}")
                        
                        update_payload = {
                            "status": "completed",
                            "completed_at": completed_at_dt.isoformat(),
                            "duration": duration_str,
                        }
                        
                        if score is not None:
                            update_payload["score"] = score
                        
                        update_result = SupabaseService.update_interview(interview_id, update_payload)
                        # Handle if the function sometimes returns a dict directly and sometimes an awaitable
                        if hasattr(update_result, "__await__"):
                            await update_result
                        logging.info(f"Updated interview status to completed for {interview_id}")
                        
                        feedback_status[interview_id] = {"status": "completed"}
                        return {"status": "success", "message": "Feedback generated successfully with multimodal batch approach"}
                    
                    except Exception as e:
                        last_err = e
                        msg = str(e)
                        if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                            # Back off and retry on rate limits
                            logging.warning(f"Hit rate limit, retrying in {5 * attempt} seconds...")
                            await asyncio.sleep(5 * attempt)
                            continue
                        # For non-rate-limit errors, log and continue to fallback method
                        logging.error(f"Error in single-call approach: {str(e)}")
                        break
                
                logging.warning(f"All single-call attempts failed or error wasn't rate-limit related. Falling back to per-turn analysis.")

            # APPROACH 2: Multi-call fallback (if single-call failed or no gemini_items)
            logging.info("Using multi-call approach as fallback")
            
            # Process missing transcriptions from audio if needed
            processed_turns = []
            for turn in conversation_turns:
                if turn.get('text_content'):
                    processed_turns.append(turn)
                elif turn.get('audio_url'):
                    logging.info(f"Transcribing audio for turn {turn.get('turn_index')}")
                    transcription = await FeedbackLiveService.process_audio_for_transcription(turn.get('audio_url'))
                    if transcription:
                        turn['text_content'] = transcription
                        try:
                            await SupabaseService.update_conversation_turn(
                                turn_id=turn.get('id'), 
                                update_data={"text_content": transcription}
                            )
                        except Exception as update_err:
                            logging.warning(f"Could not update turn with transcription: {update_err}")
                    processed_turns.append(turn)

            # 4. Analyze audio delivery for each user response
            audio_analyses = []
            for pair in qa_pairs:
                answer_turn = pair.get("answer_turn")
                if answer_turn and answer_turn.get("audio_url"):
                    question_text = pair.get("question", "")
                    audio_url = answer_turn.get("audio_url")
                    
                    logging.info(f"Analyzing audio delivery for question: {question_text[:30]}...")
                    delivery_analysis = await FeedbackLiveService.analyze_audio_delivery(
                        audio_url=audio_url,
                        question=question_text
                    )
                    
                    if delivery_analysis:
                        audio_analyses.append({
                            "question": question_text[:100] + "..." if len(question_text) > 100 else question_text,
                            "delivery_analysis": delivery_analysis
                        })
            
            logging.info(f"Generated {len(audio_analyses)} audio delivery analyses")
            
            # 5. Format the transcript
            formatted_transcript = ""
            for turn in processed_turns:
                speaker = "AI" if turn.get('speaker') == 'ai' else "User"
                text = turn.get('text_content', '')
                if text:  # Only add turns that have text content
                    formatted_transcript += f"{speaker}: {text}\n\n"
            
            if not formatted_transcript:
                raise Exception("Could not generate transcript - no text content found")
                
            # 6. Format the audio analysis for the prompt
            formatted_audio_analysis = ""
            for analysis in audio_analyses:
                formatted_audio_analysis += f"Question: {analysis['question']}\n"
                formatted_audio_analysis += f"Delivery Analysis: {analysis['delivery_analysis']}\n\n"
            
            # 7. Assemble the prompt
            resume_text = interview_data.get('resume', {}).get('extracted_text', '')
            job_title = interview_data.get('job_description', {}).get('title', '')
            job_description = interview_data.get('job_description', {}).get('description', '')
            company_name = interview_data.get('company_name', '')
            
            prompt = LIVE_FEEDBACK_PROMPT_TEMPLATE.format(
                resume=resume_text[:2000] if resume_text else "Not provided",
                job_title=job_title or "Not specified",
                job_description=job_description[:2000] if job_description else "Not provided",
                company_name=company_name or "Not specified",
                transcript=formatted_transcript,
                audio_analysis=formatted_audio_analysis
            )
            
            # 8. Call Gemini to get feedback
            try:
                logging.info(f"Calling Gemini API for interview {interview_id} (multi-call approach)")
                
                api_response = genai_client.models.generate_content(
                    model=MODEL,
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                    config={
                        "max_output_tokens": 4096,
                        "temperature": 0.4,
                        "response_mime_type": "application/json"
                    }
                )
                
                # Improved error checking to avoid NoneType errors
                if not api_response:
                    raise Exception("Empty response from Gemini API")
                if not hasattr(api_response, "candidates") or not api_response.candidates:
                    raise Exception("No candidates in Gemini API response")
                if not hasattr(api_response.candidates[0], "content") or not api_response.candidates[0].content:
                    raise Exception("Empty content in Gemini API response")
                if not hasattr(api_response.candidates[0].content, "parts") or not api_response.candidates[0].content.parts:
                    raise Exception("No content parts in Gemini API response")
                if not hasattr(api_response.candidates[0].content.parts[0], "text"):
                    raise Exception("No text in Gemini API response")
                
                feedback_text = api_response.candidates[0].content.parts[0].text
                logging.info(f"Received {len(feedback_text)} characters of feedback from Gemini")
                
                # Clean up JSON if needed
                if feedback_text.startswith("```json"):
                    feedback_text = feedback_text[7:]
                if feedback_text.endswith("```"):
                    feedback_text = feedback_text[:-3]
                
                # Parse feedback text to JSON with improved error handling
                try:
                    feedback_data = json.loads(feedback_text)
                except json.JSONDecodeError as e:
                    logging.warning(f"JSON parsing failed: {str(e)}. Attempting repair...")
                    feedback_data = await FeedbackLiveService.repair_json(feedback_text, str(e))
                    if not feedback_data:
                        raise Exception(f"Failed to parse or repair JSON from Gemini response: {str(e)}")

            except Exception as api_err:
                logging.error(f"Gemini API error: {str(api_err)}")
                raise Exception(f"Failed to generate feedback with Gemini: {str(api_err)}")
            
            # 9. Enhance the feedback with audio analysis information
            if "question_analysis" in feedback_data:
                for i, qa in enumerate(feedback_data["question_analysis"]):
                    if i < len(audio_analyses):
                        # Ensure delivery_analysis field exists
                        if "delivery_analysis" not in qa:
                            qa["delivery_analysis"] = audio_analyses[i]["delivery_analysis"]
            
            # Also add a new section if it doesn't exist
            if "delivery_feedback" not in feedback_data:
                delivery_insights = []
                for analysis in audio_analyses:
                    key_points = analysis["delivery_analysis"].split("\n")
                    for point in key_points:
                        if point.strip() and len(point.strip()) > 20:  # Only meaningful points
                            delivery_insights.append(point.strip())
                
                if delivery_insights:
                    # Remove duplicates while preserving order
                    unique_insights = []
                    for insight in delivery_insights:
                        if insight not in unique_insights:
                            unique_insights.append(insight)
                    
                    feedback_data["delivery_feedback"] = unique_insights[:5]  # Top 5 insights
            
            # 10. Save feedback and update interview status
            db_feedback_payload = {
                "interview_id": interview_id,
                "user_id": user_id,
                "feedback_data": feedback_data,
                "status": "completed",
            }
            
            feedback_result = await SupabaseService.save_feedback(db_feedback_payload)
            if isinstance(feedback_result, dict) and feedback_result.get("error"):
                error_detail = feedback_result["error"].get("message", str(feedback_result["error"]))
                raise Exception(f"Failed to save feedback to database: {error_detail}")
                
            logging.info(f"Saved feedback to database for interview {interview_id}")
            
            # 11. Calculate score, duration, and update interview status
            score = None
            if "confidence_score" in feedback_data:
                confidence_score = feedback_data.get("confidence_score", 5)
                score = min(100, max(0, confidence_score * 10))
            
            # Get interview duration
            created_at_str = interview_data.get("created_at")
            completed_at_dt = datetime.now(timezone.utc)
            duration_str = "N/A"
            
            if created_at_str:
                try:
                    # Parse timestamp and calculate duration
                    created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    duration_seconds = (completed_at_dt - created_at_dt).total_seconds()
                    duration_minutes = round(duration_seconds / 60)
                    
                    if duration_minutes < 1:
                        duration_str = "< 1 minute"
                    elif duration_minutes == 1:
                        duration_str = "1 minute"
                    else:
                        duration_str = f"{duration_minutes} minutes"
                except (ValueError, TypeError) as e:
                    logging.warning(f"Could not parse created_at '{created_at_str}': {str(e)}")
            
            # Update interview status
            update_payload = {
                "status": "completed",
                "completed_at": completed_at_dt.isoformat(),
                "duration": duration_str,
            }
            
            if score is not None:
                update_payload["score"] = score
                
            await SupabaseService.update_interview(interview_id, update_payload)
            logging.info(f"Updated interview status to completed for {interview_id}")
            
            # Update global feedback status tracker
            feedback_status[interview_id] = {"status": "completed"}
            
            return {
                "status": "success",
                "message": "Feedback generated successfully with multi-call fallback",
            }
            
        except Exception as e:
            logging.error(f"Error generating live feedback: {str(e)}")
            traceback.print_exc()
            
            # Update global feedback status tracker with error
            feedback_status[interview_id] = {"status": "error", "error": str(e)}
            
            # Try to update interview status to show error
            try:
                await SupabaseService.update_interview(interview_id, {
                    "status": "completed",  # Use valid status
                    "score": 0,  # Optional: indicate failure with a zero score
                    "duration": "Error: " + str(e)[:50]  # Store error message in duration field
                })
            except Exception:
                pass
                
            return {"status": "error", "message": str(e)}