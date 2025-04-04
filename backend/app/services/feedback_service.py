from google import genai
from google.genai import types
import json
import tempfile
import os
from typing import List, Dict
from backend.app.services.supabase_service import SupabaseService


client = genai.Client()

MODEL = "gemini-2.0-flash"

PROMPT_TEMPLATE = """"
You are an expert interviewer and feedback analyst. Please analyze the following interview responses:

Job Context:
- Resume: {resume}
- Job Title: {job_title}
- Job Description: {job_description}
- Company: {company_name}
- Location: {location}

For each question and audio response pair, provide the following analysis in JSON format:
1. A transcript of what the candidate said
2. Question-specific feedback with strengths and areas for improvement
3. Tone and communication style assessment

After analyzing all responses, provide:
1. Overall feedback summary with key strengths and improvement areas
2. Communication skills assessment
3. Overall sentiment analysis (positive, neutral, negative)
4. Confidence score (1-10)

Return the analysis as a valid JSON object with the following structure:
{{
  "question_analysis": [
    {{
      "question": "Question text here",
      "transcript": "Transcribed answer here",
      "feedback": ["Strength point 1", "Improvement area 1", "Tip 1"],
      "tone_analysis": "Assessment of tone and delivery"
    }}
  ],
  "overall_feedback": ["Point 1", "Point 2", "Point 3"],
  "communication_assessment": ["Point 1", "Point 2"],
  "sentiment": "positive/neutral/negative",
  "confidence_score": 7,
  "improvement_steps": ["Step 1", "Step 2", "Step 3"]
}}
"""

class FeedbackService:
    @staticmethod
    async def upload_audio_file(file, interview_id: str, question_id: str, question_text: str, question_order: int, user_id: str) -> dict:
        """
        Uploads the audio file to a storage service (e.g., AWS S3, Google Cloud Storage).
        Returns the URL of the uploaded file.
        """
        # Placeholder for actual upload logic. Replace with your own implementation.
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
                temp_file.write(await file.read())
                temp_file_path = temp_file.name
            gemini_file = client.files.upload(
                file_path=temp_file_path,
                mime_type="audio/webm",
                name=f"{interview_id}_{question_id}_{question_order}.webm",
                display_name=f"{interview_id}_{question_id}_{question_order}.webm"
            )

            if not gemini_file:
                raise Exception("Failed to upload file to Gemini")
            
            # store audio to supabase bucket
            # Assuming you have a function to upload the file to Supabase bucket

            file_url = SupabaseService.upload_recording_file(user_id, temp_file_path, "recordings", interview_id)
            
            file_data = {
                "interview_id": interview_id,
                "question_id": question_id,
                "gemini_file_id": gemini_file.name,
                "audio_url": file_url,
                "processed": False,
            }

            # Save the file data to the database
            user_response = SupabaseService.insert_user_response(file_data)
            if "error" in user_response:
                raise Exception("Failed to save file data to the database")
            
            os.unlink(temp_file_path)

            return {
                "file_url": file_url,
                "gemini_file_id": gemini_file.name,
                "question_id": question_id,
            }
        except Exception as e:
             # Clean up temp file if it exists
            if 'temp_path' in locals():
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
            raise Exception(f"Error uploading audio file: {str(e)}")

    @staticmethod
    def generate_feedback(interview_id: str, user_id: str) -> dict:
        """
        Generates feedback based on the resume text, job title, job description, company name, and location.
        """
        try:
            