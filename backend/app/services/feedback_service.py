
"""
FeedbackService: Handles the generation and storage of interview feedback using Gemini and Supabase.
Includes audio upload, prompt construction, and robust JSON repair for Gemini responses.
"""

from google import genai
from google.genai import types
import json
import tempfile
import os
from typing import List, Dict
from fastapi import UploadFile, HTTPException
import io
from google.api_core.exceptions import GoogleAPIError, BadRequest, Unauthorized, Forbidden, ClientError
import traceback
import time
import re
import json5
from datetime import datetime, timezone

from app.services.supabase_service import supabase_service

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.0-flash"

PROMPT_TEMPLATE = """
You are an expert interviewer and feedback analyst. Your task is to provide comprehensive and actionable feedback for a candidate's mock interview performance.
Job Context:
- Resume: {resume}
- Job Title: {job_title}
- Job Description: {job_description}
- Company: {company_name}
- Location: {location}
Instructions for Analysis:
For each question and audio response pair, provide the following analysis in JSON format:
1. A precise, word-for-word transcription of the candidate's audio response.
2. Question-Specific Feedback:
    -Strengths: List specific positive aspects of the answer, including content, relevance, and clarity.
    -Areas for Improvement: List specific areas where the answer could be strengthened.
    -Tips for Improvement: Provide concrete, actionable advice or strategies for addressing each improvement area (e.g., "Use the STAR method," "Quantify impact," "Elaborate on specific actions").
3. Tone and Communication Style Assessment: Evaluate aspects like confidence, clarity, enthusiasm, pacing, and overall professionalism.

After analyzing all responses, provide the following overall assessment:
1.  **Overall Feedback Summary:** A concise summary highlighting the candidate's key strengths across the entire interview and the most critical areas for overall improvement.
2.  **Communication Skills Assessment:** A general evaluation of the candidate's verbal communication, active listening, and presentation skills.
3.  **Overall Sentiment Analysis:** Categorize the candidate's overall sentiment during the interview (e.g., "Positive," "Neutral," "Negative").
4.  **Confidence Score:** A numerical score from 1 to 10 (1 being very low, 10 being very high) reflecting the candidate's perceived confidence.
5.  **Improvement Steps:** A prioritized list of 3-5 actionable steps the candidate can take to improve their overall interview performance.


Return the entire analysis as a single, valid JSON object. Adhere strictly to the following JSON schema:
{{
  "question_analysis": [
    {{
      "question": "The full text of the interview question.",
      "transcript": "The precise, word-for-word transcription of the candidate's audio response.",
      "feedback": {{
        "strengths": [
          "Specific strength point 1.",
          "Specific strength point 2."
        ],
        "areas_for_improvement": [
          "Specific area for improvement 1.",
          "Specific area for improvement 2."
        ],
        "tips_for_improvement": [
          "Actionable tip 1 (e.g., 'Use STAR method').",
          "Actionable tip 2 (e.g., 'Quantify impact')."
        ]
      }},
      "tone_and_style": "A concise assessment of tone and communication style."
    }}
  ],
  "overall_feedback_summary": [
    "Key overall strength 1.",
    "Key overall improvement area 1."
  ],
  "communication_assessment": [
    "Specific observation on communication skill 1.",
    "Specific observation on communication skill 2."
  ],
  "overall_sentiment": "Positive",
  "confidence_score": 7,
  "overall_improvement_steps": [
    "Overall actionable step 1.",
    "Overall actionable step 2.",
    "Overall actionable step 3."
  ]
}}
"""

class FeedbackService:
    def __init__(self, supabase_service):
        self.supabase_service = supabase_service

    def repair_json(self, json_text: str, error_message: str = None) -> dict:
        """
        Advanced JSON repair function that attempts to repair and parse any malformed JSON returned by Gemini.
        Args:
            json_text (str): The raw JSON string.
            error_message (str, optional): Error message from previous parse attempt.
        Returns:
            dict: Parsed JSON object.
        """
        try:
            # Strategy 1: Basic cleanup - remove markdown blocks, leading/trailing whitespace
            text = re.sub(r'```json|```', '', json_text).strip()
            # Strategy 2: Fix missing closing quotes at the end of values
            text = re.sub(r'": "([^"\n]*)(?=\n\s*")', '": "\\1"', text)
            text = re.sub(r'": "([^"\n]*)(?=\n\s*})', '": "\\1"', text)
            # Strategy 3: Fix missing quotes before commas
            text = re.sub(r'([^"])\s*,\s*"', '\\1",\n"', text)
            # Strategy 4: Target specific position if error message contains line and column info
            if error_message and "Unterminated string" in error_message and "line" in error_message and "column" in error_message:
                # Extract line and column from error message
                match = re.search(r'line (\d+) column (\d+)', error_message)
                if match:
                    line_num = int(match.group(1))
                    col_num = int(match.group(2))
                    
                    # Split text into lines and try to fix the specific line
                    lines = text.split('\n')
                    if 0 <= line_num-1 < len(lines):
                        # Fix by adding a closing quote at the position
                        problem_line = lines[line_num-1]
                        if col_num <= len(problem_line):
                            fixed_line = problem_line[:col_num] + '"' + problem_line[col_num:]
                            lines[line_num-1] = fixed_line
                            text = '\n'.join(lines)
                            print(f"Applied targeted fix at line {line_num}, column {col_num}")
            
            # Strategy 5: Try parsing with json5 (more forgiving JSON parser)
            try:
                return json5.loads(text)
            except Exception:
                # If json5 fails, one last attempt with custom quotes balancing
                text = self._balance_quotes(text)
                return json5.loads(text)
                
        except Exception as e:
            print(f"All JSON repair strategies failed: {str(e)}")
            raise

    @staticmethod
    def _balance_quotes(text: str) -> str:
        """
        Balance quotes in each JSON field by ensuring each field has matching quotes.
        Args:
            text (str): The JSON string to repair.
        Returns:
            str: The repaired JSON string.
        """
        pattern = r'"([^"]+)":\s*"([^"]*)'
        
        def replacer(match):
            field, value = match.groups()
            # Add closing quote if there's an odd number of quotes in the value
            return f'"{field}": "{value}"'
            
        return re.sub(pattern, replacer, text)
    async def upload_audio_file(self, file: UploadFile, interview_id: str, question_id: str, question_text: str, question_order: int, user_id: str, mime_type: str) -> dict:
        """
        Uploads the audio file to Supabase storage service and Gemini.
        The original browser recording is streamed directly to Gemini and stored in Supabase.
        
        Args:
            file (UploadFile): The audio file from the frontend.
            interview_id (str): The ID of the interview session.
            question_id (str): The ID of the question.
            question_text (str): The text of the question.
            question_order (int): The order of the question.
            user_id (str): The ID of the user.
            mime_type (str): The actual MIME type of the audio recorded by the browser (e.g., "audio/webm; codecs=opus").
        """
        original_temp_file_path = None
        # Safely get the base extension (e.g., "webm", "mp4")
        original_file_extension = mime_type.split('/')[1].split(';')[0]
        unique_suffix = int(time.time() * 1000) # Milliseconds timestamp for more granularity

        short_id = f"{interview_id[:8]}-{question_id[:8]}-{question_order}-{unique_suffix}".lower()

        
        try:
            print(f"DEBUG: Starting upload_audio_file for interview_id={interview_id}, question_id={question_id}, mime_type={mime_type}")
            print(f"DEBUG: Type of incoming 'file': {type(file)}")

            file_content = await file.read()
            print(f"DEBUG: Successfully read file content. Length: {len(file_content)} bytes")

            if not isinstance(file_content, bytes):
                raise TypeError(f"file_content is not bytes, it's {type(file_content)}. Expected bytes from file.read().")
            if not file_content:
                raise ValueError("File content is empty after reading from UploadFile.")

            # --- Step 1: Write original content to a temporary file (for Supabase upload) ---
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{original_file_extension}') as temp_file:
                temp_file.write(file_content)
                original_temp_file_path = temp_file.name
            print(f"DEBUG: Original temporary file created for Supabase & Gemini input at: {original_temp_file_path}")
    
            # --- Step 2: Create BytesIO from original file for Gemini upload ---
            # Instead of reading converted file, read original file
            file_stream_for_gemini = io.BytesIO(file_content)  # Use the original file_content
            file_stream_for_gemini.name = f"{short_id}.{original_file_extension}"  # Use original extension

            print(f"DEBUG: Attempting to upload to Gemini using in-memory BytesIO stream with mime_type: {mime_type}.")
            print(f"DEBUG: Gemini client library version: {genai.__version__}")

            try:
                file_stream_for_gemini.seek(0)  # Reset stream position

                gemini_file = client.files.upload(
                    file=file_stream_for_gemini,
                    config=types.UploadFileConfig(
                        mime_type=mime_type,  # Use original mime_type, not "audio/wav"
                        name=short_id,
                        display_name=f"{interview_id}_{question_id}_{question_order}.{original_file_extension}"  # Use original extension
                    )
                )
                print(f"DEBUG: Gemini upload response object type: {type(gemini_file)}")
                print(f"DEBUG: Gemini upload response: {gemini_file}") # This should now be a File object if successful

            # NEW: Catch more specific Google API exceptions
            except (BadRequest, Unauthorized, Forbidden, ClientError, GoogleAPIError) as api_err:
                # Log detailed API error information
                print(f"ERROR: Caught GoogleAPIError during Gemini file upload.")
                print(f"ERROR: API Error Type: {type(api_err).__name__}")
                print(f"ERROR: API Error Message: {str(api_err)}")
                # If the error object has a response/status, try to print it
                if hasattr(api_err, 'response') and hasattr(api_err.response, 'text'):
                    print(f"ERROR: API Error Response Body: {api_err.response.text}")
                elif hasattr(api_err, 'status_code'):
                    print(f"ERROR: API Error Status Code: {api_err.status_code}")
                
                # Re-raise with a more informative message
                raise Exception(f"Gemini API upload failed due to API error: {str(api_err)}")
            except Exception as other_err:
                print(f"ERROR: An unexpected error occurred during Gemini file upload: {type(other_err).__name__} - {str(other_err)}")
                traceback.print_exc() # Print full traceback for unexpected errors
                raise Exception(f"Unexpected error during Gemini file upload: {str(other_err)}")
            finally:
                file_stream_for_gemini.close() # Ensure BytesIO stream is closed

            print(f"DEBUG: File uploaded to Gemini. Gemini File ID: {gemini_file.name}")

            # The KeyError: 'file' occurred because gemini_file itself was an unexpected type or missing 'name'.
            # The try/except block above should now catch this and provide more detail.
            # This check below becomes redundant if the above try-except is robust.
            if not hasattr(gemini_file, 'name') or not gemini_file.name: # Changed from 'not gemini_file or not gemini_file.name'
                print("Failed to upload file to Gemini: gemini_file object or its name is missing.")
                raise Exception("Failed to upload file to Gemini: Response missing ID.")

            # --- Step 4: Upload original file to Supabase ---
            # Supabase receives the path to the original, unconverted file
            print(f"DEBUG: Uploading original temp file to Supabase: {original_temp_file_path}")
            response = await self.supabase_service.upload_recording_file(user_id, original_temp_file_path, "recordings", interview_id)

            # Handle different response types
            file_url = None
            if isinstance(response, str):
                file_url = response  # Already a string URL
            elif hasattr(response, 'get_public_url'):
                file_url = response.get_public_url()  # Method to get URL
            elif hasattr(response, 'url'):
                file_url = response.url  # URL property
            elif isinstance(response, dict) and 'data' in response and isinstance(response['data'], dict):
                file_url = response['data'].get('publicUrl', str(response))  # Nested response structure
            else:
                # If none of the above patterns match, convert to string as fallback
                file_url = str(response)

            print(f"DEBUG: File uploaded to Supabase bucket. URL extracted: {file_url}")

            file_data = {
                "interview_id": interview_id,
                "question_id": question_id,
                "gemini_file_id": gemini_file.name,
                "audio_url": file_url,
                "user_id": user_id,
                "processed": False,
            }

            user_response = await self.supabase_service.insert_user_response(file_data)
            if "error" in user_response:
                raise Exception(f"Failed to save file data to the database: {user_response.get('error', {})}")

            print(f"DEBUG: upload_audio_file completed successfully for {short_id}")
            return {
                "file_url": file_url,
                "gemini_file_id": gemini_file.name,
                "question_id": question_id,
            }
        except Exception as e:
            # Ensure full traceback is printed for the final error in the outer block as well
            traceback.print_exc() 
            print(f"ERROR: Final error in upload_audio_file: {str(e)}")
            raise Exception(f"Error uploading audio file: {str(e)}")
        finally:
            # --- Cleanup temporary files ---
            if original_temp_file_path and os.path.exists(original_temp_file_path):
                try:
                    os.unlink(original_temp_file_path)
                    print(f"DEBUG: Cleaned up original temporary file: {original_temp_file_path}")
                except Exception as cleanup_e:
                    print(f"ERROR: Error during original temporary file cleanup: {cleanup_e}")

    async def generate_feedback(self, interview_id: str, user_id: str) -> dict:
        """
        Generates feedback by sending interview context, questions, and audio responses to Gemini.
        """
        try:
            # Fetch interview data (context and questions)
            interview_data = await self.supabase_service.get_interview_data(user_id, interview_id)
            if not isinstance(interview_data, dict) or ("error" in interview_data and interview_data["error"]):
                error_msg = interview_data.get("error", {}).get("message", "Unknown error") if isinstance(interview_data, dict) else "Invalid data"
                raise Exception(f"Failed to fetch interview data: {error_msg}")
            
            print("DEBUG: Fetched interview data successfully: ", interview_data)

            resume = interview_data.get("resume", "Not provided")
            job = interview_data.get("job_description", {})
            job_title = job.get("title", "No job title provided")
            job_description = job.get("description", "No job description provided")
            company_name = interview_data.get("company_name", "No company name provided")
            location = interview_data.get("location", "No location provided")

            # print(f"DEBUG: Fetched interview data for ID {interview_id} with user {user_id}")
            # print(f"DEBUG: Resume: {resume}, Job Title: {job_title}, Company: {company_name}, Location: {location}")
              

            interview_questions_ids = interview_data.get("interview_questions", [])
            questions = {}
            for question in interview_questions_ids:
                # query supabase to get question text and order
                # print(f"Fetching question data for ID: {question}")
                supabase_question = self.supabase_service.get_interview_question(question)
                if not supabase_question or ("error" in supabase_question and supabase_question["error"]):
                    error_msg = supabase_question.get("error", {}).get("message", "Unknown error") if isinstance(supabase_question, dict) else "Invalid data"
                    raise Exception(f"Failed to fetch question data for ID {question}: {error_msg}")
                questions[question] = {
                    "question_text": supabase_question.data.get("question", "No question text found"),
                    "question_order": supabase_question.data.get("order", 0)
                }
            if not questions:
                raise Exception("No interview questions found for this interview.")
            
            # # Fetch user responses (audio file IDs and associated question info)
            # # Ensure get_user_responses returns question_text and question_order, or fetch questions separately and map
            user_responses_data = self.supabase_service.get_user_responses(interview_id)
            if not user_responses_data or ("error" in user_responses_data and user_responses_data["error"]):
                error_msg = user_responses_data.get("error", {}).get("message", "Unknown error") if isinstance(user_responses_data, dict) else "Invalid data"
                raise Exception(f"Failed to fetch user responses: {error_msg}")
            
            # match user response with questions based on question_id
            for response in user_responses_data:
                question_id = response.get("question_id")
                if question_id in questions:
                    response["question_text"] = questions[question_id]["question_text"]
                    response["question_order"] = questions[question_id]["question_order"]
                else:
                    print(f"Warning: No matching question found for response with question_id {question_id}")
            
            # sort user responses by question order
            user_responses_data.sort(key=lambda x: x.get("question_order", 0))

            prompt_parts = [
                PROMPT_TEMPLATE.format(
                    resume=resume.get("extracted_text", "No resume provided"),
                    job_title=job_title,
                    job_description=job_description,
                    company_name=company_name,
                    location=location
                )
            ]
            
            # read it over again
            for response_item in user_responses_data:
                question_text = response_item.get("question_text")
                gemini_file_id = response_item.get("gemini_file_id")

                if not question_text or not gemini_file_id:
                    print(f"Skipping response due to missing question_text or gemini_file_id: {response_item}")
                    continue
                
                prompt_parts.append(f"\nInterview Question: {question_text}")
                prompt_parts.append("Candidate's Audio Response:")
                
                try:
                    # Fetch the File object from Gemini
                    gemini_file_object = client.files.get(name=gemini_file_id) # 'name' is the identifier
                    prompt_parts.append(gemini_file_object)
                except Exception as e:
                    raise Exception(f"Failed to fetch audio file {gemini_file_id} from Gemini: {str(e)}")

            if len(prompt_parts) == 1 and user_responses_data:  # Only context prompt, but responses existed (all skipped)
                raise Exception("No valid audio responses could be prepared for Gemini.")


            prompt_parts.append("\nPlease provide the full analysis in the specified JSON format based on all preceding questions and audio responses.")

            # Convert prompt_parts to a format that works with client.models
            contents = [{"role": "user", "parts": []}]

            # Add text parts to contents
            for part in prompt_parts:
                if isinstance(part, str):
                    contents[0]["parts"].append({"text": part})
                else:
                    # This is a file object
                    contents[0]["parts"].append({
                        "file_data": {
                            "file_uri": f"https://generativelanguage.googleapis.com/v1beta/{part.name}",
                            "mime_type": "audio/webm"  # Adjust based on your actual audio format
                        }
                    })

            # Use the same API pattern as in interview_service.py
            try:
                # Generate feedback
                api_response = client.models.generate_content(
                    model=MODEL,
                    contents=contents,
                    config={
                        "max_output_tokens": 4096,
                        "temperature": 0.5,
                        "response_mime_type": "application/json"
                    }
                )
                
                # Extract text from response
                if api_response and api_response.candidates:
                    feedback_text = api_response.candidates[0].content.parts[0].text
                    
                    # Clean up JSON if needed
                    if feedback_text.startswith("```json"):
                        feedback_text = feedback_text[7:]
                    if feedback_text.endswith("```"):
                        feedback_text = feedback_text[:-3]

                else:
                    raise Exception("Empty response from Gemini")
            except Exception as e:
                print(f"Gemini API error: {str(e)}")
                print(f"Request details: model={MODEL}")
                raise Exception(f"Failed to generate feedback with Gemini: {str(e)}")
            
            if not feedback_text:
                raise Exception("Feedback generation returned empty result from Gemini.")
            
            try:
                # First try standard JSON parsing
                feedback_data = json.loads(feedback_text)
            except json.JSONDecodeError as e:
                print(f"Standard JSON parsing failed. Error: {str(e)}")
                try:
                    # Try our enhanced repair function with the error message
                    feedback_data = self.repair_json(feedback_text, str(e))
                    print("Successfully repaired and parsed JSON")
                except Exception as repair_e:
                    print(f"JSON repair failed: {str(repair_e)}")
                    print(f"Raw response (first 500 chars): {feedback_text[:500]}...")
                    
                    # Create a minimal valid structure as fallback
                    feedback_data = {
                        "question_analysis": [],
                        "overall_feedback_summary": ["Sorry, we couldn't analyze your interview properly. Please try again."],
                        "communication_assessment": ["Communication appeared adequate"],
                        "overall_sentiment": "Neutral",  # Fixed capitalization to match expected format
                        "confidence_score": 5,
                        "overall_improvement_steps": ["Try the interview again for better feedback"]
                    }
                    print("Using fallback feedback structure due to parsing errors")

            if not isinstance(feedback_data, dict):
                raise Exception("Parsed feedback is not a valid JSON object.")
            
            print(f"DEBUG: Feedback data structure: {feedback_data}")
            
            # Basic validation of feedback structure
            if "question_analysis" not in feedback_data or "overall_feedback_summary" not in feedback_data:
                # Match keys from your PROMPT_TEMPLATE's JSON structure
                print("Feedback JSON from Gemini is missing required fields.")
                print(f"Feedback data keys: {feedback_data.keys()}")
                # raise Exception("Feedback JSON from Gemini does not contain required fields (e.g., 'question_analysis', 'overall_feedback_summary').")

            # # Save the feedback to Supabase
            # # Ensure SupabaseService.save_feedback expects this structure
            db_feedback_payload = {
                "interview_id": interview_id,
                "user_id": user_id,
                "feedback_data": feedback_data, # Storing the entire JSON object
                "status": "completed",  
            }
            
            feedback_result = self.supabase_service.save_feedback(db_feedback_payload)
            if "error" in feedback_result and feedback_result["error"]:
                error_detail = feedback_result["error"].get("message", str(feedback_result["error"]))
                raise Exception(f"Failed to save feedback to the database: {error_detail}")
            
            # --- Calculate Score, Duration and Finalize Interview ---
            score = None
            if "confidence_score" in feedback_data:
                # Convert score from 1-10 scale to 0-100, with a default
                confidence_score = feedback_data.get("confidence_score", 5)
                score = min(100, max(0, confidence_score * 10))

            created_at_str = interview_data.get("created_at")
            completed_at_dt = datetime.now(timezone.utc)
            duration_str = "N/A"

            if created_at_str:
                try:
                    # Supabase timestamps are timezone-aware ISO strings
                    created_at_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    
                    # Calculate duration in minutes
                    duration_seconds = (completed_at_dt - created_at_dt).total_seconds()
                    duration_minutes = round(duration_seconds / 60)
                    
                    if duration_minutes < 1:
                        duration_str = "< 1 minute"
                    elif duration_minutes == 1:
                        duration_str = "1 minute"
                    else:
                        duration_str = f"{duration_minutes} minutes"
                except (ValueError, TypeError) as e:
                    print(f"Warning: Could not parse created_at '{created_at_str}' to calculate duration. Error: {e}")

            # Update the interview status, completion time, duration, and score
            update_payload = {
                "status": "completed",
                "completed_at": completed_at_dt.isoformat(),
                "duration": duration_str,
            }
            if score is not None:
                update_payload["score"] = score
                
            self.supabase_service.update_interview(interview_id, update_payload)

            return {
                "status": "success",
                "message": "Feedback generated successfully",
            }
        except Exception as e:
            # Log the full error for debugging
            print(f"Error in generate_feedback for interview {interview_id}, user {user_id}: {str(e)}")
            # Re-raise the original exception or a new one with more context
            raise Exception(f"Error generating feedback: {str(e)}")
