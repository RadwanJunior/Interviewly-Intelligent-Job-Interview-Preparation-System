from google import genai
from google.genai import types
import json
import logging
from app.services.supabase_service import supabase_service
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
- Format your feedback as clear bullet points (not paragraphs) that are specific and actionable.
- Ensure a balanced analysis with 2-4 clear strengths and 2-4 clear areas for improvement.
- Return a single JSON object using this schema:
{{
  "question_analysis": [
    {{
      "question": "The interview question",
      "transcript": "Verbatim transcription from the audio",
      "delivery_analysis": "Analysis of vocal tone, pacing, confidence, clarity, enthusiasm, and professionalism",
      "feedback": {{
        "strengths": [
          "Specific strength point 1 that begins with an action verb or positive descriptor",
          "Specific strength point 2 that begins with an action verb or positive descriptor",
          "Specific strength point 3 that begins with an action verb or positive descriptor"
        ],
        "areas_for_improvement": [
          "Specific improvement area 1 that begins with an action verb or clear issue",
          "Specific improvement area 2 that begins with an action verb or clear issue"
        ],
        "tips_for_improvement": [
          "Actionable tip 1 that starts with a specific verb (e.g., 'Use the STAR method to...')",
          "Actionable tip 2 that starts with a specific verb (e.g., 'Prepare 2-3 examples of...')"
        ]
      }},
      "tone_and_style": "Concise assessment of tone and communication style"
    }}
  ],
  "overall_feedback_summary": ["Key strength 1", "Key improvement area 1"],
  "communication_assessment": ["Communication observation 1", "Communication observation 2"],
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
        """Enhanced JSON repair function for handling malformed JSON from Gemini"""
        try:
            # First try: Remove markdown code blocks
            text = re.sub(r'```json|```', '', json_text).strip()
            
            # Strategy from feedback_service: Target specific position if error contains line/column info
            if error_message:
                if "Expecting ',' delimiter" in error_message:
                    match = re.search(r'line (\d+) column (\d+)', error_message)
                    if match:
                        line_num = int(match.group(1))
                        col_num = int(match.group(2))
                        
                        # Split text into lines and try to fix the specific line
                        lines = text.split('\n')
                        if 0 <= line_num-1 < len(lines):
                            problem_line = lines[line_num-1]
                            if col_num <= len(problem_line):
                                # Insert a comma at the problem position
                                fixed_line = problem_line[:col_num] + ',' + problem_line[col_num:]
                                lines[line_num-1] = fixed_line
                                text = '\n'.join(lines)
                                logging.info(f"Applied targeted comma fix at line {line_num}, column {col_num}")
            
            # Handle triple quotes (common issue in Gemini output)
            text = re.sub(r'^"""|"""$|"""', '"', text, flags=re.MULTILINE)
            
            # Fix unterminated strings
            text = re.sub(r'"([^"]*?)(?=\n\s*")', r'"\1"', text)
            text = re.sub(r'"([^"]*?)$', r'"\1"', text)
            
            # Handle line breaks inside strings
            text = re.sub(r'"\s*\n\s*([^"]*)', r'"\n\1', text)
            text = re.sub(r'([^"])\s*\n\s*"', r'\1\n"', text)
            
            # Fix missing commas between array elements
            text = re.sub(r'"\s*\n\s*"', '",\n"', text)  # Between strings
            text = re.sub(r'}\s*\n\s*{', '},\n{', text)   # Between objects
            text = re.sub(r']\s*\n\s*"', '],\n"', text)   # After array
            
            # Fix missing quotes, commas, and other common issues
            text = re.sub(r'": "([^"\n]*)(?=\n\s*")', '": "\\1"', text)
            text = re.sub(r'": "([^"\n]*)(?=\n\s*})', '": "\\1"', text)
            text = re.sub(r'([^"])\s*,\s*"', '\\1",\n"', text)
            
            # Fix quote escaping issues
            text = re.sub(r'(?<!\\)"(?=\w)', r'\\"', text)
            
            # Handle runaway strings
            lines = text.split('\n')
            fixed_lines = []
            in_broken_string = False
            
            for line in lines:
                if in_broken_string:
                    if '"' in line and not line.strip().startswith('"'):
                        fixed_lines.append(f'"{line}')
                        in_broken_string = False
                    else:
                        continue
                else:
                    if line.count('"') % 2 == 1:
                        if line.strip().endswith('"'):
                            in_broken_string = True
                            fixed_lines.append(line + '"')
                        elif line.strip().startswith('"'):
                            fixed_lines.append('"' + line)
                        else:
                            fixed_lines.append('"' + line + '"')
                    else:
                        fixed_lines.append(line)
                        
            text = '\n'.join(fixed_lines)
            
            # Debug: Save the repaired JSON to inspect
            with open(f"debug_repaired_json_{datetime.now().strftime('%H%M%S')}.json", "w") as f:
                f.write(text)
            
            # Try parsing with json5 (more forgiving JSON parser)
            try:
                return json5.loads(text)
            except Exception:
                # If json5 fails, try balancing quotes
                text = FeedbackLiveService.balance_quotes(text)
                return json5.loads(text)
                
        except Exception as e:
            logging.error(f"All JSON repair strategies failed: {str(e)}")
            
            # Return a minimal valid structure as fallback when all else fails
            return {
                "question_analysis": [{
                    "question": "Interview question", 
                    "transcript": "Transcription available in the interview recording",
                    "delivery_analysis": "Audio analysis was successful but JSON parsing encountered an error",
                    "feedback": {
                        "strengths": ["Interview completed successfully"],
                        "areas_for_improvement": ["Try viewing the interview recording directly"],
                        "tips_for_improvement": ["Review the recorded interview for detailed feedback"]
                    },
                    "tone_and_style": "Analysis available in recording"
                }],
                "overall_feedback_summary": ["Interview completed successfully. Please view the recording for details."],
                "communication_assessment": ["Assessment available in the recording"],
                "delivery_feedback": ["Feedback available in the recording"],
                "overall_sentiment": "Neutral",
                "confidence_score": 5,
                "overall_improvement_steps": ["Review the recorded interview"]
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
            audio_url = supabase_service.normalize_public_url(audio_url)
            logging.info(f"Processing audio from URL: {audio_url}")

            async with httpx.AsyncClient() as http:
                resp = await http.get(audio_url)
                if resp.status_code != 200:
                    logging.error(f"Failed to download audio (public URL). HTTP {resp}")
                    # Try re-signing the stored URL (works if bucket is private)
                    signed = supabase_service.to_signed_url_from_public_url(audio_url, expires_in=60 * 60)
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

            audio_url = supabase_service.normalize_public_url(audio_url)
            logging.info(f"Analyzing audio delivery from URL: {audio_url}")

            async with httpx.AsyncClient() as http:
                resp = await http.get(audio_url)
                if resp.status_code != 200:
                    logging.error(f"Failed to download audio (public URL). HTTP {resp}")
                    signed = supabase_service.to_signed_url_from_public_url(audio_url, expires_in=60 * 60)
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
        audio_url = supabase_service.normalize_public_url(audio_url)
        try:
            async with httpx.AsyncClient() as http:
                resp = await http.get(audio_url)
                if resp.status_code != 200:
                    signed = supabase_service.to_signed_url_from_public_url(audio_url, expires_in=60 * 60)
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
            base_name = f"{interview_id[:8]}-answer-{display_name.replace('.wav', '').replace('_', '')}"
            clean_name = re.sub(r'[^a-z0-9-]', '', base_name)
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
        Generates holistic feedback for a live interview by analyzing audio responses
        using a single multimodal call to Gemini.
        """
        try:
            logging.info(f"Starting live feedback generation for interview {interview_id}")
            
            # 1. Fetch interview data
            interview_data = await supabase_service.get_interview_data(user_id, interview_id)
            if not interview_data:
                raise Exception(f"Failed to retrieve interview data for interview {interview_id}")
            
            # 2. Get conversation turns
            conversation_turns = await supabase_service.get_all_conversation_turns(interview_id)
            if not conversation_turns:
                logging.warning(f"No conversation turns found for interview {interview_id}. Checking for user responses...")
                user_responses = supabase_service.get_user_responses(interview_id)
                if user_responses:
                    # Create synthetic conversation turns from user_responses
                    conversation_turns = []
                    for i, response in enumerate(user_responses):
                        question_id = response.get("question_id")
                        question_data = supabase_service.get_interview_question(question_id)
                        
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

            # 3. Build Q&A pairs (more robust version)
            qa_pairs = []
            turns_by_index = {turn.get('turn_index'): turn for turn in conversation_turns}
            sorted_indices = sorted(turns_by_index.keys())

            # Match pairs by looking at consecutive turns
            for i in range(len(sorted_indices) - 1):
                current_idx = sorted_indices[i]
                next_idx = sorted_indices[i + 1]
                
                current_turn = turns_by_index[current_idx]
                next_turn = turns_by_index[next_idx]
                
                # Check if we have an AI->user turn sequence (question->answer)
                if (current_turn.get('speaker') == 'ai' and 
                    next_turn.get('speaker') == 'user' and
                    next_turn.get('audio_url')):  # Must have audio URL
                    
                    # We have a potential Q&A pair
                    qa_pairs.append({
                        "question": current_turn.get('text_content') or f"Question {i+1}",  # Fallback if no text
                        "question_turn": current_turn,
                        "answer": next_turn.get('text_content', ''),  # Can be empty
                        "answer_turn": next_turn
                    })

            logging.info(f"Built {len(qa_pairs)} question-answer pairs using consecutive turn matching")

            # 4. Upload audio files to Gemini
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
            
            if not gemini_items:
                raise Exception("No audio files could be prepared for analysis")

            # 5. Prepare prompt and contents ...
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
                contents[0]["parts"].append({"text": f"\nInterview Question: {item['question']}"})
                contents[0]["parts"].append({
                    "file_data": {
                        "file_uri": f"https://generativelanguage.googleapis.com/v1beta/{item['file_name']}",
                        "mime_type": "audio/wav"
                    }
                })

            # 6. Call multimodal model with retry logic
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
                    
                    # Add after getting the Gemini response but before parsing
                    if not api_response or not getattr(api_response, "candidates", None):
                        raise Exception("Empty response from Gemini API")

                    feedback_text = api_response.candidates[0].content.parts[0].text

                    # Debug logging to see the raw JSON
                    with open(f"debug_gemini_response_{interview_id[:8]}_{datetime.now().strftime('%H%M%S')}.json", "w") as f:
                        f.write(feedback_text)

                    if feedback_text.startswith("```json"):
                        feedback_text = feedback_text[7:]
                    if feedback_text.endswith("```"):
                        feedback_text = feedback_text[:-3]
                    
                    try:
                        feedback_data = json.loads(feedback_text)
                    except json.JSONDecodeError as e:
                        logging.warning(f"JSON parsing failed: {str(e)}. Attempting repair...")
                        feedback_data = await FeedbackLiveService.repair_json(feedback_text, str(e))

                    # 7. Save feedback
                    db_feedback_payload = {
                        "interview_id": interview_id,
                        "user_id": user_id,
                        "feedback_data": feedback_data,
                        "status": "completed",
                    }
                    
                    feedback_result = await supabase_service.save_feedback(db_feedback_payload)
                    if isinstance(feedback_result, dict) and feedback_result.get("error"):
                        error_detail = feedback_result["error"].get("message", str(feedback_result["error"]))
                        raise Exception(f"Failed to save feedback to database: {error_detail}")

                    logging.info(f"Saved feedback to database for interview {interview_id}")

                    # 8. Compute score and update interview
                    score = None
                    if "confidence_score" in feedback_data:
                        confidence_score = feedback_data.get("confidence_score", 5)
                        score = min(100, max(0, int(confidence_score) * 10))
                    
                    created_at_str = interview_data.get("created_at")
                    completed_at_dt = datetime.now(timezone.utc)
                    duration_str = "N/A"
                    
                    if created_at_str:
                        try:
                            # First try: standard parsing with Z replacement
                            try:
                                created_at_dt = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                            except ValueError:
                                # Second try: handle timestamps with non-standard microsecond precision
                                match = re.match(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(.*)', created_at_str)
                                if match:
                                    base_dt, micro_str, tz_info = match.groups()
                                    # Normalize to 6 digits for microseconds
                                    micro_str = micro_str.ljust(6, '0')[:6]
                                    # Reconstruct the timestamp
                                    fixed_timestamp = f"{base_dt}.{micro_str}{tz_info}"
                                    created_at_dt = datetime.fromisoformat(fixed_timestamp.replace('Z', '+00:00'))
                                else:
                                    # Third try: handle timestamps without microseconds
                                    created_at_dt = datetime.fromisoformat(created_at_str.split('.')[0].replace('Z', '+00:00'))
        
                            # Ensure timezone info
                            if created_at_dt.tzinfo is None:
                                created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
                            

                            if completed_at_dt.tzinfo is None:
                                completed_at_dt = completed_at_dt.replace(tzinfo=timezone.utc)
                            

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
                            duration_str = "Duration calculation failed"
                    
                    update_payload = {
                        "status": "completed",
                        "completed_at": completed_at_dt.isoformat(),
                        "duration": duration_str,
                    }
                    
                    if score is not None:
                        update_payload["score"] = score
                    
                    update_result = supabase_service.update_interview(interview_id, update_payload)
                    if hasattr(update_result, "__await__"):
                        await update_result
                    logging.info(f"Updated interview status to completed for {interview_id}")
                    
                    feedback_status[interview_id] = {"status": "completed"}
                    return {"status": "success", "message": "Feedback generated successfully"}
                
                except Exception as e:
                    last_err = e
                    msg = str(e)
                    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                        wait_time = 5 * attempt
                        logging.warning(f"Hit rate limit, retrying in {wait_time} seconds...")
                        await asyncio.sleep(wait_time)
                    else:
                        logging.error(f"Error in feedback generation: {str(e)}")
                        break
            
            raise Exception(f"All attempts failed: {str(last_err)}")
        
        except Exception as e:
            logging.error(f"Error generating live feedback: {str(e)}")
            traceback.print_exc()
            
            feedback_status[interview_id] = {"status": "error", "error": str(e)}
            
            try:
                update_payload = {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "score": 0,
                }
                update_result = supabase_service.update_interview(interview_id, update_payload)
                if hasattr(update_result, "__await__"):
                    await update_result
            except Exception:
                pass
                
            return {"status": "error", "message": str(e)}
