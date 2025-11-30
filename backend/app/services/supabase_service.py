# Standard library imports
import asyncio
import os
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from urllib.parse import urlparse

# Third-party imports
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile, HTTPException, Request, WebSocket
from gotrue.errors import AuthApiError



# Load environment variables from .env file
load_dotenv()


# Retrieve Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")


# Initialize Supabase client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Expiry time for signed URLs (30 days)
expiry = 60 * 60 * 24 * 30  # 30 days in seconds


class SupabaseService:
    """
    Service class for interacting with Supabase authentication, storage, and database tables.
    Provides methods for user management, file storage, resume/job/interview CRUD, and more.
    """
    def __init__(self, client=None):
        # Use provided client or default to global supabase_client
        self.client = client or supabase_client 

    def create_user(self, email: str, password: str):
        """Creates a new user in Supabase."""
        try:
            response = self.client.auth.sign_up({"email": email, "password": password})
            if response.user:
                return response
            return {"error": {"message": "User creation failed"}}
        except Exception as e:
            return {"error": {"message": str(e)}}

    def login_user(self, email: str, password: str):
        """Logs in a user and returns session tokens."""
        try:
            response = self.client.auth.sign_in_with_password({"email": email, "password": password})
            if response and response.session:
                return {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "user": response.user,
                }
            return {"error": {"message": "Invalid login credentials"}}
        except Exception as e:
            return {"error": {"message": str(e)}}

    def refresh_token(self, refresh_token: str):
        """Refreshes the access token using a refresh token."""
        try:
            response = self.client.auth.refresh_session(refresh_token)
            if response and response.session:
                return {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "user": response.user,
                }
            return {"error": {"message": "Invalid refresh token"}}
        except Exception as e:
            return {"error": {"message": str(e)}}

    def logout(self):
        """Logs out the user by revoking the session."""
        try:
            response = self.client.auth.sign_out()
            return {"message": "Logged out successfully"}
        except Exception as e:
            return {"error": {"message": str(e)}}

    def create_profile(self, profile_data: dict):
        """Inserts a new profile record into the profiles table."""
        try:
            response = self.client.from_("profiles").insert([profile_data]).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_profile(self, user_id: str):
        """Retrieves a profile record from the profiles table."""
        try:
            response = self.client.from_("profiles").select("*").eq("id", user_id).single()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_current_user(self, request: Request):
        """
        Retrieves the current user by extracting the token from Authorization headers.
        """
        token = request.cookies.get("access_token")
        if not token:
            return None
        try:
            response = self.client.auth.get_user(token)
            return response.user
        except Exception as e:
            return {"error": {"message": str(e)}}

    def get_current_user_ws(self, websocket: WebSocket):
        """
        Retrieves the current user by extracting the token from WebSocket connection cookies.
        """
        token = websocket.cookies.get("access_token")
        if not token:
            return None
        try:
            response = self.client.auth.get_user(token)
            return response.user
        except (AuthApiError, Exception):
            return None

    def get_file_url(self, file_path: str, bucket_name: str = "public"):
        """Generates a public URL for a file in Supabase Storage."""
        try:
            response = self.client.storage.from_(bucket_name).create_signed_url(file_path, expiry, {"download": True})
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    async def upload_file(self, user_id: str, file: UploadFile, bucket_name: str = "public"):
        """Uploads a file to Supabase Storage."""
        try:
            file_content = await file.read()
            response = self.client.storage.from_(bucket_name).upload(f"{user_id}/{file.filename}", file_content)
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def delete_file(self, file_path: str, bucket_name: str = "public"):
        """Deletes a file from Supabase Storage."""
        try:
            response = self.client.storage.from_(bucket_name).remove([file_path])
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def create_resume(self, user_id: str, file_url: str, extracted_text: str) -> dict:
        """
        Inserts a new resume record into the 'resumes' table.
        """
        try:
            response = self.client.table("resumes").insert({
                "user_id": user_id,
                "file_url": file_url,
                "extracted_text": extracted_text
            }).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def update_resume(self, resume_id: str, extracted_text: str) -> dict:
        """
        Updates the extracted text of an existing resume record.
        """
        try:
            response = self.client.table("resumes").update({
                "extracted_text": extracted_text
            }).eq("id", resume_id).execute()
            return response
        except Exception as e:
            print(f"Error updating resume: {str(e)}")
            return {"error": {"message": str(e)}}
    
    def get_resume_table(self, user_id: str) -> dict:
        """
        Retrieves all resume records for a user from the 'resumes' table.
        """
        try:
            response = self.client.table("resumes").select("*").eq("user_id", user_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_resume_storage(self, user_id: str, bucket_name: str = "resumes") -> dict:
        """
        Retrieves all files stored in Supabase Storage for a user.
        """
        try:
            response = self.client.storage.from_(bucket_name).list(user_id)
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def create_job_description(self, user_id: str, job_title: str, company_name: str, location: str, job_type: str, description: str) -> dict:
        """
        Inserts a new job description record into the 'job_descriptions' table.
        """
        try:
            response = self.client.table("job_descriptions").insert({
                "user_id": user_id,
                "title": job_title,
                "company": company_name,
                "location": location,
                "type": job_type,
                "description": description
            }).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
        
    def get_job_details_table(self, user_id: str) -> dict:
        """
        Retrieves all job details records for a user from the 'job_details' table.
        """
        try:
            response = self.client.table("job_details").select("*").eq("user_id", user_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def create_interview_session(self, user_id: str, resume_id: str, job_description_id: str, questions: list, ctype: str, status: str = "pending") -> dict:
        """
        Inserts a new interview session record into the 'interviews' table.
        """
        try:
            response = self.client.table("interviews").insert({
                "user_id": user_id,
                "resume_id": resume_id,
                "job_description_id": job_description_id,
                "interview_questions": questions,
                "status": status,
                "type": ctype
            }).execute()
            logging.info(f"Created interview session: {response}")
            return response
        except Exception as e:
            logging.error(f"Error creating interview session: {str(e)}")
            return {"error": {"message": str(e)}}
    
    def get_interview_session(self, interview_id: str) -> dict:
        """
        Retrieves a single interview session by ID.
        """
        try:
            response = self.client.table("interviews").select("*").eq("id", interview_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_interview_sessions(self, user_id: str) -> dict:
        """
        Retrieves all interview session records for a user from the 'interviews' table.
        """
        try:
            response = self.client.table("interviews").select("*").eq("user_id", user_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def update_interview_session(self, session_id: str, status: str) -> dict:
        """
        Updates the status of an existing interview session record.
        """
        try:
            response = self.client.table("interviews").update({
                "status": status
            }).eq("id", session_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_latest_interview_session(self, user_id: str) -> dict:
        """
        Retrieves the latest interview session record for a user from the 'interviews' table.
        """
        try:
            response = self.client.table("interviews").select("*").eq("user_id", user_id).order("created_at", ascending=False).limit(1).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
        
    def get_interview_questions(self, session_id: str) -> dict:
        """
        Retrieves the interview questions for a specific session from the 'interviews' table.
        """
        try:
            response = self.client.table("interviews").select("interview_questions").eq("id", session_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def create_interview_question(self, interview_id: str, question: str) -> dict:
        """
        Inserts a new record into the 'interview_questions' table for a given interview.
        """
        try:
            response = self.client.table("interview_questions").insert({
                "interview_id": interview_id,
                "question": question
            }).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def update_interview_session_questions(self, session_id: str, question_ids: list) -> dict:
        """
        Updates the interview session record with the list of interview question IDs.
        """
        try:
            response = self.client.table("interviews").update({
                "interview_questions": question_ids
            }).eq("id", session_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def get_job_description(self, job_description_id: str) -> dict:
        """
        Retrieves a specific job description record from the 'job_descriptions' table.
        """
        try:
            response = self.client.table("job_descriptions").select("*").eq("id", job_description_id).single().execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def insert_interview_questions(self, question_records: list) -> dict:
        """
        Inserts a batch of interview questions into the 'interview_questions' table.
        """
        try:
            response = self.client.table("interview_questions").insert(question_records).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def get_interview_question(self, question_id: str) -> dict:
        """
        Retrieves a specific interview question record from the 'interview_questions' table.
        """
        try:
            response = self.client.table("interview_questions").select("*").eq("id", question_id).single().execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def get_interview_question_table(self, interview_id: str) -> dict:
        """
        Retrieves all interview question records for a given interview from the 'interview_questions' table.
        """
        try:
            response = self.client.table("interview_questions").select("*").eq("interview_id", interview_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    async def insert_user_response(self, response: dict) -> dict:
        """
        Inserts a new user response record into the 'user_responses' table.
        Supports both text and audio responses.
        """
        try:
            # Prepare insert data and remove None values so supabase won't complain
            insert_data = {
                "interview_id": response.get("interview_id"),
                "question_id": response.get("question_id"),
                "user_id": response.get("user_id"),
                "response_text": response.get("response_text"),
                "audio_url": response.get("audio_url"),
                "gemini_file_id": response.get("gemini_file_id"),
                "processed": response.get("processed", False),
            }
            
            # Remove None values so supabase won't complain
            insert_data = {k: v for k, v in insert_data.items() if v is not None}

            resp = self.client.table("user_responses").insert(insert_data).execute()
            return resp
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_user_response(self, interview_id: str) -> dict:
        """
        Retrieves all user response records for a given interview from the 'user_responses' table.
        """
        try:
            response = self.client.table("user_responses").select("*").eq("interview_id", interview_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def update_user_response(self, response_id: str, processed: bool) -> dict:
        """
        Updates the processed status of a user response record.
        """
        try:
            response = self.client.table("user_responses").update({
                "processed": processed
            }).eq("id", response_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def insert_feedback(self, feedback: dict) -> dict:
        """
        Inserts a new feedback record into the 'feedback' table.
        """
        try:
            response = self.client.table("feedback").insert(feedback).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_feedback(self, interview_id: str) -> dict:
        """
        Retrieves feedback records for a given interview from the 'feedback' table.
        """
        try:
            response = self.client.table("feedback").select("*").eq("interview_id", interview_id).execute()
            return response.data
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    async def upload_recording_file(
        self,
        user_id: str,
        interview_id: str,
        file_content: bytes,
        file_extension: str,
        bucket_name: str = "recordings"
    ) -> Optional[str]:
        """
        Uploads audio file content to Supabase Storage and returns a secure, time-limited signed URL.

        This method is designed for private buckets, ensuring that audio files are not publicly accessible.
        It handles the entire process of creating a unique path, uploading, and generating a usable URL.

        Args:
            user_id: The ID of the user uploading the file.
            interview_id: The ID of the interview session.
            file_content: The raw bytes of the audio file.
            file_extension: The extension of the file (e.g., "webm", "mp4").
            bucket_name: The name of the Supabase storage bucket.

        Returns:
            A string containing the signed URL on success, or None on failure.
        """
        try:
            # 1. Create a unique, deterministic file path in storage.
            # This is cleaner than using temporary file names.
            timestamp = int(time.time() * 1000)
            storage_path = f"{user_id}/{interview_id}/{timestamp}.{file_extension}"
            
            logging.info(f"[Supabase] Uploading {len(file_content)} bytes to bucket '{bucket_name}' at path: {storage_path}")

            # 2. Upload the file content.
            # The `file_options={"upsert": "true"}` will overwrite if a file with the exact same millisecond timestamp exists.
            self.client.storage.from_(bucket_name).upload(
                path=storage_path,
                file=file_content,
                file_options={"upsert": "true"} # Use upsert to prevent errors on retries
            )
            
            # 3. Generate a signed URL. This is the secure way for private buckets.
            # It creates a temporary URL that expires after one hour.
            signed_url_response = self.client.storage.from_(bucket_name).create_signed_url(
                path=storage_path,
                expires_in=3600  # Expires in 1 hour
            )

            # 4. The Supabase client returns a dictionary. We must safely extract the URL string.
            if not signed_url_response or 'signedURL' not in signed_url_response:
                logging.error(f"[Supabase] Failed to create signed URL for {storage_path}. Response was empty or invalid.")
                return None

            file_url = signed_url_response['signedURL']
            logging.info(f"[Supabase] Successfully generated signed URL for {storage_path}")
            
            return file_url

        except Exception as e:
            # Log the full exception for detailed debugging.
            logging.error(f"[Supabase] An exception occurred in upload_recording_file for interview {interview_id}: {str(e)}", exc_info=True)
            return None
    
    async def get_interview_data(self, user_id: str, interview_id: str) -> dict:
        """
        Retrieves interview data for a specific user and interview ID.
        """
        try:
            response = self.client.table("interviews").select("*").eq("user_id", user_id).eq("id", interview_id).single().execute()
            # get resume and job description details from id retrieved
            if hasattr(response, "data") and response.data:
                interview_data = response.data
                resume_id = interview_data.get("resume_id")
                job_description_id = interview_data.get("job_description_id")
                
                # Fetch resume details
                resume_response = self.client.table("resumes").select("*").eq("id", resume_id).single().execute()
                interview_data["resume"] = getattr(resume_response, "data", {})

                # Fetch job description details
                job_response = self.client.table("job_descriptions").select("*").eq("id", job_description_id).single().execute()
                interview_data["job_description"] = getattr(job_response, "data", {})

                # Fetch enhanced prompt if available
                try:
                    enhanced_prompt = await self.get_enhanced_prompt(interview_id)
                    if enhanced_prompt:
                        interview_data["enhanced_prompt"] = enhanced_prompt
                except Exception as e:
                    logging.warning(f"Could not fetch enhanced prompt for interview {interview_id}: {e}")
                
                return interview_data
        except Exception as e:
            return {"error": {"message": str(e)}}

    def get_user_responses(self, interview_id: str) -> dict:
        """
        Retrieves all user responses for a specific interview.
        """
        try:
            response = self.client.table("user_responses").select("*").eq("interview_id", interview_id).execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}

    def save_feedback(self, feedback: dict) -> dict:
        """
        Saves feedback for a specific interview.
        """
        try:
            response = self.client.table("feedback").insert({
                "interview_id": feedback.get("interview_id"),
                "user_id": feedback.get("user_id"),
                "feedback_data": feedback.get("feedback_data"),
                "status": feedback.get("status", "pending"),
                "error_msg": feedback.get("error_msg", ""),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
            
            }).execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    def get_question_by_order(self, interview_id: str, order: int) -> dict:
        """
        Retrieves a specific interview question by its order for a given interview.
        """
        try:
            response = self.client.table("interview_questions").select("*").eq("interview_id", interview_id).eq("order", order).single().execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    async def update_user_responses_processed(self, interview_id: str):
        """
        Updates all user responses for a specific interview to mark them as processed.
        """
        try:
            response = self.client.table("user_responses").update({"processed": True}).eq("interview_id", interview_id).execute()
            return response.data if hasattr(response, "data") and response.data else {"message": "No records updated"}
        except Exception as e:
            return {"error": {"message": str(e)}}

    def get_interview_history(self, user_id: str):
        """Get interview history with related data"""
        try:
            # Get all interviews for the user
            interview_response = self.client.table("interviews").select(
                "id, created_at, completed_at, status, score, duration, type, job_description_id, resume_id"
            ).eq("user_id", user_id).order("created_at", desc=True).execute()
            
            return interview_response.data if hasattr(interview_response, "data") else []
        except Exception as e:
            print(f"Error getting interview history: {str(e)}")
            return {"error": str(e)}

    def get_job_description_details(self, job_id: str):
        """Get job description details"""
        try:
            response = self.client.table("job_descriptions").select(
                "title, company, location"
            ).eq("id", job_id).single().execute()
            
            return response.data if hasattr(response, "data") else {}
        except Exception as e:
            print(f"Error getting job description: {str(e)}")
            return {"error": str(e)}

    def get_interview_feedback(self, interview_id: str):
        """Get feedback for an interview"""
        try:
            response = self.client.table("feedback").select(
                "feedback_data"
            ).eq("interview_id", interview_id).single().execute()
            
            return response.data if hasattr(response, "data") else None
        except Exception as e:
            print(f"Error getting feedback: {str(e)}")
            return {"error": str(e)}

    async def update_interview(self, interview_id: str, update_data: dict):
        """Update interview data"""
        try:
            response = self.client.table("interviews").update(update_data).eq("id", interview_id).execute()
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error updating interview: {str(e)}")
            return {"error": str(e)}

    def get_active_preparation_plan(self, user_id: str):
        """Get active preparation plan for a user"""
        try:
            response = self.client.table("interview_plans").select(
                "*"
            ).eq("user_id", user_id).eq("status", "active").order("created_at", desc=True).limit(1).execute()

            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error getting active plan: {str(e)}")
            return {"error": str(e)}

    def get_all_user_plans(self, user_id: str):
        """Get all preparation plans for a user, sorted by most recent"""
        try:
            response = self.client.table("interview_plans").select(
                "*"
            ).eq("user_id", user_id).order("created_at", desc=True).execute()

            return response.data if hasattr(response, "data") and response.data else []
        except Exception as e:
            print(f"Error getting all plans: {str(e)}")
            return {"error": str(e)}

    def create_preparation_plan(self, plan_data: dict):
        """Create a new preparation plan"""
        try:
            response = self.client.table("interview_plans").insert(plan_data).execute()
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error creating preparation plan: {str(e)}")
            return {"error": str(e)}

    def update_preparation_plan(self, plan_id: str, update_data: dict):
        """Update a preparation plan"""
        try:
            response = self.client.table("interview_plans").update(update_data).eq("id", plan_id).execute()
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error updating preparation plan: {str(e)}")
            return {"error": str(e)}

    def check_plan_ownership(self, plan_id: str, user_id: str) -> bool:
        """Check if a plan belongs to a user"""
        try:
            response = self.client.table("interview_plans").select(
                "id"
            ).eq("id", plan_id).eq("user_id", user_id).execute()

            return hasattr(response, "data") and len(response.data) > 0
        except Exception as e:
            print(f"Error checking plan ownership: {str(e)}")
            return False

    def update_preparation_plan_status_by_user(self, user_id: str, status: str):
        """Update status of all preparation plans for a user"""
        try:
            response = self.client.table("interview_plans").update({
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", user_id).eq("status", "active").execute()

            return response.data if hasattr(response, "data") and response.data else {"message": "No records updated"}
        except Exception as e:
            print(f"Error updating preparation plan status: {str(e)}")
            return {"error": str(e)}

    def normalize_public_url(self, url: str) -> str:
        if not isinstance(url, str) or not url:
            return ""
        # Remove empty query and collapse double slashes after domain
        url = url.rstrip("?")
        sentinel = "§§SCHEME§§"
        url = url.replace("://", sentinel)
        while "//" in url:
            url = url.replace("//", "/")
        url = url.replace(sentinel, "://")
        return url

    def _parse_storage_object_from_url(self, url: str):
        """
        Parse bucket and object path from a Supabase Storage URL.
        Supports /storage/v1/object/public/<bucket>/<key> and /storage/v1/object/sign/<bucket>/<key>?token=...
        """
        try:
            path = urlparse(url).path
            # Find segment after '/object/'
            marker = "/storage/v1/object/"
            if marker not in path:
                return None, None
            after = path.split(marker, 1)[1]  # e.g. 'public/recordings/user/.../file.wav'
            parts = after.split("/")
            if len(parts) < 3:
                return None, None
            # parts[0] = 'public' or 'sign'
            bucket = parts[1]
            obj_path = "/".join(parts[2:])
            return bucket, obj_path
        except Exception:
            return None, None

    def to_signed_url_from_public_url(self, url: str, expires_in: int = 60 * 60) -> str:
        """
        Convert any stored public URL into a fresh signed URL (works even if bucket is private).
        """
        clean = self.normalize_public_url(url)
        bucket, obj_path = self._parse_storage_object_from_url(clean)
        if not bucket or not obj_path:
            return ""
        try:
            signed = self.client.storage.from_(bucket).create_signed_url(obj_path, expires_in)
            # Pull out actual string URL from supabase response shapes
            out = None
            if hasattr(signed, "data") and isinstance(signed.data, dict):
                out = signed.data.get("signedUrl")
            elif isinstance(signed, dict):
                out = signed.get("signedUrl")
            return self.normalize_public_url(out or "")
        except Exception:
            return ""

    # async def upload_audio_to_storage(self, user_id: str, interview_id: str, audio_data: bytes, filename: str) -> str:
    #     """
    #     Uploads audio data to Supabase Storage and returns the URL.
    #     """
    #     try:
    #         bucket_name = "recordings"
    #         storage_path = f"{user_id}/{interview_id}/{filename}"
            
    #         # Upload the audio data
    #         logging.info(f"Uploading {len(audio_data)} bytes to {storage_path}")
    #         upload_response = self.client.storage.from_(bucket_name).upload(
    #             storage_path,
    #             audio_data,
    #             file_options={"upsert": True} 
    #         )
            
    #         # Check for error in response
    #         if isinstance(upload_response, dict) and upload_response.get("error"):
    #             logging.error(f"Upload error: {upload_response.get('error')}")
    #             return None
                
    #         # Generate the public URL directly (don't try to extract from response)
    #         try:
    #             # For public buckets, get the public URL
    #             public_url = self.client.storage.from_(bucket_name).get_public_url(storage_path)
    #             logging.info(f"Generated public URL: {public_url}")
    #             return public_url
    #         except Exception as e:
    #             logging.error(f"Error generating public URL: {str(e)}")
                
    #             # Try signed URL as backup
    #             try:
    #                 signed_url = self.client.storage.from_(bucket_name).create_signed_url(
    #                     storage_path,
    #                     3600  # 1 hour expiry
    #                 )
    #                 logging.info(f"Generated signed URL as fallback")
    #                 return signed_url
    #             except Exception as sign_err:
    #                 logging.error(f"Error generating signed URL: {str(sign_err)}")
                    
    #         return None
    #     except Exception as e:
    #         logging.error(f"Error uploading audio to storage: {str(e)}")
    #         return None
    async def upload_audio_to_storage(self, user_id: str, interview_id: str, audio_data: bytes, filename: str) -> str:
        """
        Uploads audio data to Supabase Storage with retry logic and returns the URL.
        """
        bucket_name = "recordings"
        storage_path = f"{user_id}/{interview_id}/{filename}"
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                logging.info(f"Uploading {len(audio_data)} bytes to {storage_path} (Attempt {attempt + 1}/{max_retries})")
                
                # Use upsert=True to prevent "Duplicate" errors on retries
                self.client.storage.from_(bucket_name).upload(
                    path=storage_path,
                    file=audio_data,
                    file_options={"upsert": "true"} 
                )
                
                # If upload succeeds, generate and return the URL
                public_url = self.client.storage.from_(bucket_name).get_public_url(storage_path)
                logging.info(f"Generated public URL: {public_url}")
                return public_url
                
            except Exception as e:
                logging.error(f"Attempt {attempt + 1} failed for {storage_path}: {str(e)}")
                if attempt < max_retries - 1:
                    # Exponential backoff: wait 1s, 2s before retrying
                    wait_time = 2 ** attempt
                    logging.info(f"Retrying in {wait_time} second(s)...")
                    await asyncio.sleep(wait_time)
                else:
                    logging.error(f"All {max_retries} upload attempts failed for {storage_path}.")
                    return None # Return None after all retries fail
    async def save_conversation_turn(self, turn_data: dict):
        """
        Saves a conversation turn to the database. Normalizes audio_url and includes user_id if present.
        """
        try:
            record = {
                "interview_id": turn_data.get("interview_id"),
                "turn_index": turn_data.get("turn_index"),
                "speaker": turn_data.get("speaker"),
                "text_content": turn_data.get("text_content", ""),
                "audio_url": self.normalize_public_url(turn_data.get("audio_url") or ""),
                "audio_duration_seconds": turn_data.get("audio_duration_seconds"),
            }
            if turn_data.get("user_id"):
                record["user_id"] = turn_data.get("user_id")

            print(f"Saving conversation turn: {record}")
            response = self.client.table("conversation_turns").insert(record).execute()
            return response.data if hasattr(response, "data") else {"message": "Turn saved successfully"}
        except Exception as e:
            print(f"Error saving conversation turn: {str(e)}")
            return {"error": {"message": str(e)}}
    
    async def get_all_conversation_turns(self, interview_id: str):
        """
        Retrieves all conversation turns for an interview, sorted by turn_index.
        """
        try:
            response = self.client.table("conversation_turns")\
                .select("*")\
                .eq("interview_id", interview_id)\
                .order("turn_index")\
                .execute()
            return response.data if hasattr(response, "data") else []
        except Exception as e:
            print(f"Error fetching conversation turns: {str(e)}")
            return []

    async def update_conversation_turn(self, turn_id: str, update_data: dict):
        """
        Updates a conversation turn record by id.
        """
        try:
            response = self.client.table("conversation_turns")\
                .update(update_data)\
                .eq("id", turn_id)\
                .execute()
            return response.data if hasattr(response, "data") else {"message": "updated"}
        except Exception as e:
            print(f"Error updating conversation turn: {str(e)}")
            return {"error": {"message": str(e)}}

    async def save_feedback(self, feedback: dict) -> dict:
        """
        Saves feedback for a specific interview. (Async to match callers)
        """
        try:
            response = self.client.table("feedback").insert({
                "interview_id": feedback.get("interview_id"),
                "user_id": feedback.get("user_id"),
                "feedback_data": feedback.get("feedback_data"),
                "status": feedback.get("status", "pending"),
                "error_msg": feedback.get("error_msg", ""),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
            }).execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}

    # RAG-specific methods
    async def store_enhanced_prompt(self, interview_id: str, enhanced_prompt: str, source: str = "rag") -> Dict[str, Any]:
        """
        Stores an enhanced prompt for an interview.
        
        Args:
            interview_id: UUID of the interview
            enhanced_prompt: Text content of the enhanced prompt (max 50KB recommended)
            source: Source of the prompt (rag, existing_data, new_data)
        
        Returns:
            dict: {"success": True, "data": {...}} or {"success": False, "error": "..."}
        """
        try:
            # Validate inputs
            if not interview_id:
                logging.error("[Supabase] store_enhanced_prompt: Missing interview_id")
                return {"success": False, "error": "Missing interview_id"}
            
            if not enhanced_prompt:
                logging.error(f"[Supabase] store_enhanced_prompt: Missing enhanced_prompt for interview {interview_id}")
                return {"success": False, "error": "Missing enhanced_prompt"}
            
            if not isinstance(enhanced_prompt, str):
                logging.error(f"[Supabase] store_enhanced_prompt: enhanced_prompt must be string, got {type(enhanced_prompt)}")
                return {"success": False, "error": f"Invalid type for enhanced_prompt: {type(enhanced_prompt).__name__}"}
            
            # Execute insert
            response = self.client.table("interview_enhanced_prompts").insert({
                "interview_id": interview_id,
                "prompt": enhanced_prompt,
                "source": source
            }).execute()
            
            # Check response
            if not response.data or len(response.data) == 0:
                logging.error(f"[Supabase] store_enhanced_prompt: No data returned from insert for interview {interview_id}")
                return {"success": False, "error": "Insert failed - no data returned"}
            
            logging.info(f"[Supabase] Successfully stored enhanced prompt for interview {interview_id}")
            return {"success": True, "data": response.data[0]}
            
        except Exception as e:
            logging.error(f"[Supabase] store_enhanced_prompt: Exception for interview {interview_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_enhanced_prompt(self, interview_id):
        """Gets the RAG-enhanced prompt for an interview if available"""
        try:
            response = self.client.table("interview_enhanced_prompts") \
                .select("prompt") \
                .eq("interview_id", interview_id) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]["prompt"]
            return None
        except Exception as e:
            logging.error(f"Error fetching enhanced prompt: {str(e)}")
            return None

    async def update_interview_status(self, session_id: str, status: str):
        """Updates the status of an interview session."""
        try:
            response = (
                self.client.table("interviews")
                .update({"status": status})
                .eq("id", session_id)
                .execute()
            )
            logging.info(f"[Supabase] Successfully updated interview {session_id} status to '{status}'")
            return {"success": True, "data": response.data}
        except Exception as e:
            logging.error(f"[Supabase] Failed to update interview status for {session_id}: {e}")
            return {"success": False, "error": str(e)}
        
    async def get_interview_status(self, session_id: str):
        """Fetches the current status of an interview session."""
        try:
            response = (
                self.client.table("interviews")
                .select("status")
                .eq("id", session_id)
                .single()
                .execute()
            )
            if response.data and "status" in response.data:
                return response.data["status"]
            return None
        except Exception as e:
            logging.error(f"[Supabase] Failed to fetch interview status for {session_id}: {e}")
            return None

    async def store_enhanced_prompt_and_update_status(
        self, interview_id: str, enhanced_prompt: str, source: str = "rag", target_status: str = "ready"
    ) -> Dict[str, Any]:
        """
        Atomically stores an enhanced prompt AND updates interview status.
        This prevents race conditions where prompt is stored but status update fails.
        
        Args:
            interview_id: UUID of the interview
            enhanced_prompt: Text content of the enhanced prompt
            source: Source of the prompt (rag, existing_data, new_data)
            target_status: Status to set after successful storage (default: "ready")
            
        Returns:
            dict: {"success": True, "data": {...}} or {"success": False, "error": "...", "rollback": bool}
        """
        prompt_stored = False
        prompt_record = None
        
        try:
            # Step 1: Store the enhanced prompt
            store_result = await self.store_enhanced_prompt(
                interview_id=interview_id,
                enhanced_prompt=enhanced_prompt,
                source=source
            )
            
            if not store_result.get("success"):
                # Prompt storage failed - nothing to rollback
                logging.error(
                    f"[Supabase] store_enhanced_prompt_and_update_status: "
                    f"Failed to store prompt for interview {interview_id}: {store_result.get('error')}"
                )
                return {
                    "success": False,
                    "error": f"Prompt storage failed: {store_result.get('error')}",
                    "rollback": False
                }
            
            prompt_stored = True
            prompt_record = store_result.get("data")
            logging.info(f"[Supabase] Prompt stored successfully for interview {interview_id}, updating status...")
            
            # Step 2: Update the interview status
            status_result = await self.update_interview_status(
                session_id=interview_id,
                status=target_status
            )
            
            if not status_result.get("success"):
                # Status update failed - prompt is orphaned!
                logging.error(
                    f"[Supabase] store_enhanced_prompt_and_update_status: "
                    f"CRITICAL - Prompt stored but status update failed for interview {interview_id}. "
                    f"Prompt ID: {prompt_record.get('id')}, Error: {status_result.get('error')}"
                )
                
                # Attempt to delete the orphaned prompt (rollback)
                try:
                    logging.warning(f"[Supabase] Attempting to rollback orphaned prompt for interview {interview_id}")
                    delete_response = self.client.table("interview_enhanced_prompts") \
                        .delete() \
                        .eq("id", prompt_record.get("id")) \
                        .execute()
                    
                    if delete_response.data:
                        logging.info(f"[Supabase] Successfully rolled back orphaned prompt for interview {interview_id}")
                        return {
                            "success": False,
                            "error": f"Status update failed: {status_result.get('error')}",
                            "rollback": True
                        }
                    else:
                        logging.error(f"[Supabase] Rollback failed - orphaned prompt remains for interview {interview_id}")
                        return {
                            "success": False,
                            "error": f"Status update failed AND rollback failed: {status_result.get('error')}",
                            "rollback": False,
                            "orphaned_prompt_id": prompt_record.get("id")
                        }
                except Exception as rollback_error:
                    logging.critical(
                        f"[Supabase] Rollback exception for interview {interview_id}: {str(rollback_error)}. "
                        f"MANUAL CLEANUP REQUIRED for prompt ID: {prompt_record.get('id')}"
                    )
                    return {
                        "success": False,
                        "error": f"Status update failed AND rollback crashed: {str(rollback_error)}",
                        "rollback": False,
                        "orphaned_prompt_id": prompt_record.get("id"),
                        "requires_manual_cleanup": True
                    }
            
            # Both operations succeeded!
            logging.info(
                f"[Supabase] Successfully stored prompt and updated status to '{target_status}' "
                f"for interview {interview_id}"
            )
            return {
                "success": True,
                "data": {
                    "prompt_record": prompt_record,
                    "interview_status": status_result.get("data"),
                    "final_status": target_status
                }
            }
            
        except Exception as e:
            logging.error(
                f"[Supabase] store_enhanced_prompt_and_update_status: Unexpected exception "
                f"for interview {interview_id}: {str(e)}"
            )
            
            # If prompt was stored, try to rollback
            if prompt_stored and prompt_record:
                try:
                    logging.warning(f"[Supabase] Exception occurred, attempting rollback for interview {interview_id}")
                    self.client.table("interview_enhanced_prompts") \
                        .delete() \
                        .eq("id", prompt_record.get("id")) \
                        .execute()
                    return {"success": False, "error": str(e), "rollback": True}
                except:
                    return {
                        "success": False,
                        "error": str(e),
                        "rollback": False,
                        "orphaned_prompt_id": prompt_record.get("id")
                    }
            
            return {"success": False, "error": str(e), "rollback": False}

    def get_interview_history_with_job_details(self, user_id: str):
        """
        Get interview history with job descriptions in ONE query using JOIN.
        This replaces the N+1 query problem where we fetched job descriptions individually.
        
        Returns a list of interviews with embedded job_description data.
        """
        try:
            # ✅ Use Supabase's JOIN syntax to fetch everything at once
            response = self.client.table("interviews").select(
                """
                id,
                created_at,
                completed_at,
                status,
                score,
                duration,
                type,
                job_description_id,
                resume_id,
                job_descriptions!inner(
                    title,
                    company,
                    location
                )
                """
            ).eq("user_id", user_id).order("created_at", desc=True).execute()
            
            # Transform the nested structure to flat structure for easier consumption
            interviews = []
            if hasattr(response, "data") and response.data:
                for interview in response.data:
                    # Extract job_descriptions from nested object
                    job_desc = interview.pop("job_descriptions", {})
                    
                    # Flatten the structure
                    interview["job_title"] = job_desc.get("title", "")
                    interview["company"] = job_desc.get("company", "")
                    interview["location"] = job_desc.get("location", "")
                    
                    interviews.append(interview)
            
            logging.info(f"✅ Fetched {len(interviews)} interviews with job details in ONE query for user {user_id}")
            return interviews
            
        except Exception as e:
            logging.error(f"❌ Error getting interview history with job details: {str(e)}", exc_info=True)
            return {"error": str(e)}

# Singleton instance of SupabaseService for use throughout the app
supabase_service = SupabaseService()
