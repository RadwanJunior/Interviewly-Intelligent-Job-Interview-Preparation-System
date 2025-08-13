import os
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile, Request, WebSocket
import time
from datetime import datetime, timezone
from gotrue.errors import AuthApiError
from urllib.parse import urlparse


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
expiry = 60 * 60 * 24 * 30  # 30 days in seconds

class SupabaseService:
    @staticmethod
    def create_user(email: str, password: str):
        """Creates a new user in Supabase."""
        try:
            response = supabase_client.auth.sign_up({"email": email, "password": password})
            if response.user:
                return response
            return {"error": {"message": "User creation failed"}}
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def login_user(email: str, password: str):
        """Logs in a user and returns session tokens."""
        try:
            response = supabase_client.auth.sign_in_with_password({"email": email, "password": password})
            if response and response.session:
                return {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "user": response.user,
                }
            return {"error": {"message": "Invalid login credentials"}}
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def refresh_token(refresh_token: str):
        """Refreshes the access token using a refresh token."""
        try:
            response = supabase_client.auth.refresh_session(refresh_token)
            if response and response.session:
                return {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "user": response.user,
                }
            return {"error": {"message": "Invalid refresh token"}}
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def logout():
        """Logs out the user by revoking the session."""
        try:
            response = supabase_client.auth.sign_out()
            return {"message": "Logged out successfully"}
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def create_profile(profile_data: dict):
        """Inserts a new profile record into the profiles table."""
        try:
            response = supabase_client.from_("profiles").insert([profile_data]).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_profile(user_id: str):
        """Retrieves a profile record from the profiles table."""
        try:
            response = supabase_client.from_("profiles").select("*").eq("id", user_id).single()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_current_user(request: Request):
        """
        Retrieves the current user by extracting the token from Authorization headers.
        """
        token = request.cookies.get("access_token")
        if not token:
            return None
        try:
            response = supabase_client.auth.get_user(token)
            return response.user
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def get_current_user_ws(websocket: WebSocket):
        """
        Retrieves the current user by extracting the token from WebSocket connection cookies.
        """
        token = websocket.cookies.get("access_token")
        if not token:
            return None
        try:
            response = supabase_client.auth.get_user(token)
            return response.user
        except (AuthApiError, Exception):
            return None

    @staticmethod
    def get_file_url(file_path: str, bucket_name: str = "public"):
        """Generates a public URL for a file in Supabase Storage."""
        try:
            response = supabase_client.storage.from_(bucket_name).create_signed_url(file_path, expiry, {"download": True})
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    async def upload_file(user_id: str, file: UploadFile, bucket_name: str = "public"):
        """Uploads a file to Supabase Storage."""
        try:
            file_content = await file.read()
            response = supabase_client.storage.from_(bucket_name).upload(f"{user_id}/{file.filename}", file_content)
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def delete_file(file_path: str, bucket_name: str = "public"):
        """Deletes a file from Supabase Storage."""
        try:
            response = supabase_client.storage.from_(bucket_name).remove([file_path])
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def create_resume(user_id: str, file_url: str, extracted_text: str) -> dict:
        """
        Inserts a new resume record into the 'resumes' table.
        """
        try:
            response = supabase_client.table("resumes").insert({
                "user_id": user_id,
                "file_url": file_url,
                "extracted_text": extracted_text
            }).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def update_resume(resume_id: str, extracted_text: str) -> dict:
        """
        Updates the extracted text of an existing resume record.
        """
        try:
            response = supabase_client.table("resumes").update({
                "extracted_text": extracted_text
            }).eq("id", resume_id).execute()
            return response
        except Exception as e:
            print(f"Error updating resume: {str(e)}")
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_resume_table(user_id: str) -> dict:
        """
        Retrieves all resume records for a user from the 'resumes' table.
        """
        try:
            response = supabase_client.table("resumes").select("*").eq("user_id", user_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_resume_storage(user_id: str, bucket_name: str = "resumes") -> dict:
        """
        Retrieves all files stored in Supabase Storage for a user.
        """
        try:
            response = supabase_client.storage.from_(bucket_name).list(user_id)
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def create_job_description(user_id: str, job_title: str, company_name: str, location: str, job_type: str, description: str) -> dict:
        """
        Inserts a new job description record into the 'job_descriptions' table.
        """
        try:
            response = supabase_client.table("job_descriptions").insert({
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
        
    @staticmethod
    def get_job_details_table(user_id: str) -> dict:
        """
        Retrieves all job details records for a user from the 'job_details' table.
        """
        try:
            response = supabase_client.table("job_details").select("*").eq("user_id", user_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def create_interview_session(user_id: str, resume_id: str, job_description_id: str, questions: list, ctype: str) -> dict:
        """
        Inserts a new interview session record into the 'interview_sessions' table.
        """
        try:
            response = supabase_client.table("interviews").insert({
                "user_id": user_id,
                "resume_id": resume_id,
                "job_description_id": job_description_id,
                "interview_questions": questions,
                "status": "pending",
                "type": ctype
            }).execute()
            print(f"Supabase response: {response}")
            return response
        except Exception as e:
            print(f"Error creating interview session: {str(e)}")
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_interview_sessions(user_id: str) -> dict:
        """
        Retrieves all interview session records for a user from the 'interview_sessions' table.
        """
        try:
            response = supabase_client.table("interview_sessions").select("*").eq("user_id", user_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def update_interview_session(session_id: str, status: str) -> dict:
        """
        Updates the status of an existing interview session record.
        """
        try:
            response = supabase_client.table("interview_sessions").update({
                "status": status
            }).eq("id", session_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_latest_interview_session(user_id: str) -> dict:
        """
        Retrieves the latest interview session record for a user from the 'interviews' table.
        """
        try:
            response = supabase_client.table("interviews").select("*").eq("user_id", user_id).order("created_at", ascending=False).limit(1).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
        
    @staticmethod
    def get_interview_questions(session_id: str) -> dict:
        """
        Retrieves the interview questions for a specific session from the 'interview_sessions' table.
        """
        try:
            response = supabase_client.table("interviews").select("interview_questions").eq("id", session_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def create_interview_question(interview_id: str, question: str) -> dict:
        """
        Inserts a new record into the 'interview_questions' table for a given interview.
        """
        try:
            response = supabase_client.table("interview_questions").insert({
                "interview_id": interview_id,
                "question": question
            }).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def update_interview_session_questions(session_id: str, question_ids: list) -> dict:
        """
        Updates the interview session record with the list of interview question IDs.
        """
        try:
            response = supabase_client.table("interviews").update({
                "interview_questions": question_ids
            }).eq("id", session_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def get_job_description(job_description_id: str) -> dict:
        """
        Retrieves a specific job description record from the 'job_descriptions' table.
        """
        try:
            response = supabase_client.table("job_descriptions").select("*").eq("id", job_description_id).single().execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def insert_interview_questions(question_records: list) -> dict:
        """
        Inserts a batch of interview questions into the 'interview_questions' table.
        """
        try:
            response = supabase_client.table("interview_questions").insert(question_records).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def get_interview_question(question_id: str) -> dict:
        """
        Retrieves a specific interview question record from the 'interview_questions' table.
        """
        try:
            response = supabase_client.table("interview_questions").select("*").eq("id", question_id).single().execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def get_interview_question_table(interview_id: str) -> dict:
        """
        Retrieves all interview question records for a given interview from the 'interview_questions' table.
        """
        try:
            response = supabase_client.table("interview_questions").select("*").eq("interview_id", interview_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    async def insert_user_response(response: dict) -> dict:
        """
        Inserts a new user response record into the 'user_responses' table.
        """
        try:
            response = supabase_client.table("user_responses").insert({
                "interview_id": response.get("interview_id"),
                "question_id": response.get("question_id"),
                "audio_url": response.get("audio_url"),
                "gemini_file_id": response.get("gemini_file_id"),
                "processed": response.get("processed"),
            }).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_user_response(interview_id: str) -> dict:
        """
        Retrieves all user response records for a given interview from the 'user_responses' table.
        """
        try:
            response = supabase_client.table("user_responses").select("*").eq("interview_id", interview_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def update_user_response(response_id: str, processed: bool) -> dict:
        """
        Updates the processed status of a user response record.
        """
        try:
            response = supabase_client.table("user_responses").update({
                "processed": processed
            }).eq("id", response_id).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def insert_feedback(feedback: dict) -> dict:
        """
        Inserts a new feedback record into the 'feedback' table.
        """
        try:
            response = supabase_client.table("feedback").insert(feedback).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def get_feedback(interview_id: str) -> dict:
        """
        Retrieves feedback records for a given interview from the 'feedback' table.
        """
        try:
            response = supabase_client.table("feedback").select("*").eq("interview_id", interview_id).execute()
            return response.data
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    async def upload_recording_file(user_id: str, file_path: str, bucket_name: str = "recordings", interview_id: str = None):
        """Uploads a file to Supabase Storage."""
        try:
            # Read the file from the path
            with open(file_path, "rb") as f:
                file_content = f.read()
                
            # Create a filename for storage
            filename = os.path.basename(file_path)
            storage_path = f"{user_id}/{interview_id}/{filename}"
            
            # Upload to Supabase storage
            response = supabase_client.storage.from_(bucket_name).upload(
                storage_path, 
                file_content
            )
            
            # Generate and return the public URL
            if "error" not in response:
                file_url = supabase_client.storage.from_(bucket_name).get_public_url(
                    storage_path
                )
                return file_url
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    async def get_interview_data(user_id: str, interview_id: str) -> dict:
        """
        Retrieves interview data for a specific user and interview ID.
        """
        try:
            response = supabase_client.table("interviews").select("*").eq("user_id", user_id).eq("id", interview_id).single().execute()
            # get resume and job description details from id retrieved
            if hasattr(response, "data") and response.data:
                interview_data = response.data
                resume_id = interview_data.get("resume_id")
                job_description_id = interview_data.get("job_description_id")
                
                # Fetch resume details
                resume_response = supabase_client.table("resumes").select("*").eq("id", resume_id).single().execute()
                interview_data["resume"] = getattr(resume_response, "data", {})

                # Fetch job description details
                job_response = supabase_client.table("job_descriptions").select("*").eq("id", job_description_id).single().execute()
                interview_data["job_description"] = getattr(job_response, "data", {})
                return interview_data
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def get_user_responses(interview_id: str) -> dict:
        """
        Retrieves all user responses for a specific interview.
        """
        try:
            response = supabase_client.table("user_responses").select("*").eq("interview_id", interview_id).execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def save_feedback(feedback: dict) -> dict:
        """
        Saves feedback for a specific interview.
        """
        try:
            response = supabase_client.table("feedback").insert({
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
    
    @staticmethod
    def get_question_by_order(interview_id: str, order: int) -> dict:
        """
        Retrieves a specific interview question by its order for a given interview.
        """
        try:
            response = supabase_client.table("interview_questions").select("*").eq("interview_id", interview_id).eq("order", order).single().execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}
    
    @staticmethod
    def update_user_responses_processed(interview_id: str):
        """
        Updates all user responses for a specific interview to mark them as processed.
        """
        try:
            response = supabase_client.table("user_responses").update({"processed": True}).eq("interview_id", interview_id).execute()
            return response.data if hasattr(response, "data") else response
        except Exception as e:
            return {"error": {"message": str(e)}}

    @staticmethod
    def get_interview_history(user_id: str):
        """Get interview history with related data"""
        try:
            # Get all interviews for the user
            interview_response = supabase_client.table("interviews").select(
                "id, created_at, completed_at, status, score, duration, type, job_description_id, resume_id"
            ).eq("user_id", user_id).order("created_at", desc=True).execute()
            
            return interview_response.data if hasattr(interview_response, "data") else []
        except Exception as e:
            print(f"Error getting interview history: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def get_job_description_details(job_id: str):
        """Get job description details"""
        try:
            response = supabase_client.table("job_descriptions").select(
                "title, company, location"
            ).eq("id", job_id).single().execute()
            
            return response.data if hasattr(response, "data") else {}
        except Exception as e:
            print(f"Error getting job description: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def get_interview_feedback(interview_id: str):
        """Get feedback for an interview"""
        try:
            response = supabase_client.table("feedback").select(
                "feedback_data"
            ).eq("interview_id", interview_id).single().execute()
            
            return response.data if hasattr(response, "data") else None
        except Exception as e:
            print(f"Error getting feedback: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def update_interview(interview_id: str, update_data: dict):
        """Update interview data"""
        try:
            response = supabase_client.table("interviews").update(update_data).eq("id", interview_id).execute()
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error updating interview: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def get_active_preparation_plan(user_id: str):
        """Get active preparation plan for a user"""
        try:
            response = supabase_client.table("preparation_plans").select(
                "*"
            ).eq("user_id", user_id).eq("status", "active").order("created_at", desc=True).limit(1).execute()
            
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error getting active plan: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def create_preparation_plan(plan_data: dict):
        """Create a new preparation plan"""
        try:
            response = supabase_client.table("preparation_plans").insert(plan_data).execute()
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error creating preparation plan: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def update_preparation_plan(plan_id: str, update_data: dict):
        """Update a preparation plan"""
        try:
            response = supabase_client.table("preparation_plans").update(update_data).eq("id", plan_id).execute()
            return response.data[0] if hasattr(response, "data") and response.data else None
        except Exception as e:
            print(f"Error updating preparation plan: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def check_plan_ownership(plan_id: str, user_id: str) -> bool:
        """Check if a plan belongs to a user"""
        try:
            response = supabase_client.table("preparation_plans").select(
                "id"
            ).eq("id", plan_id).eq("user_id", user_id).execute()
            
            return hasattr(response, "data") and len(response.data) > 0
        except Exception as e:
            print(f"Error checking plan ownership: {str(e)}")
            return False
    @staticmethod
    def update_preparation_plan_status_by_user(user_id: str, status: str):
        """Update status of all preparation plans for a user"""
        try:
            response = supabase_client.table("preparation_plans").update({
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", user_id).eq("status", "active").execute()
            
            return response.data if hasattr(response, "data") and response.data else {"message": "No records updated"}
        except Exception as e:
            print(f"Error updating preparation plan status: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def normalize_public_url(url: str) -> str:
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

    @staticmethod
    def _parse_storage_object_from_url(url: str):
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

    @staticmethod
    def to_signed_url_from_public_url(url: str, expires_in: int = 60 * 60) -> str:
        """
        Convert any stored public URL into a fresh signed URL (works even if bucket is private).
        """
        clean = SupabaseService.normalize_public_url(url)
        bucket, obj_path = SupabaseService._parse_storage_object_from_url(clean)
        if not bucket or not obj_path:
            return ""
        try:
            signed = supabase_client.storage.from_(bucket).create_signed_url(obj_path, expires_in=expires_in)
            # Pull out actual string URL from supabase response shapes
            out = None
            if hasattr(signed, "data") and isinstance(signed.data, dict):
                out = signed.data.get("signedUrl")
            elif isinstance(signed, dict):
                out = signed.get("signedUrl")
            return SupabaseService.normalize_public_url(out or "")
        except Exception:
            return ""

    @staticmethod
    async def upload_audio_to_storage(user_id: str, interview_id: str, audio_data: bytes, filename: str) -> str:
        """
        Upload audio and return a fetchable URL. We return a signed URL to work with private buckets.
        """
        try:
            storage_path = f"{user_id}/{interview_id}/{filename}"
            # Upload to 'recordings' bucket
            result = supabase_client.storage.from_("recordings").upload(
                path=storage_path,
                file=audio_data,
                file_options={"content-type": "audio/wav", "upsert": True}
            )
            if hasattr(result, 'error') and result.error:
                print(f"Storage upload error: {result.error}")
                return ""

            # Prefer signed URL (works irrespective of bucket public setting)
            signed = supabase_client.storage.from_("recordings").create_signed_url(storage_path, expires_in=60 * 60 * 24)
            url = None
            if hasattr(signed, "data") and isinstance(signed.data, dict):
                url = signed.data.get("signedUrl")
            elif isinstance(signed, dict):
                url = signed.get("signedUrl")

            # Fallback to public URL if signing failed
            if not url:
                public_resp = supabase_client.storage.from_("recordings").get_public_url(storage_path)
                if hasattr(public_resp, "data") and isinstance(public_resp.data, dict):
                    url = public_resp.data.get("publicUrl") or public_resp.data.get("public_url")
                elif isinstance(public_resp, dict):
                    url = public_resp.get("publicUrl") or public_resp.get("public_url")
                elif isinstance(public_resp, str):
                    url = public_resp

            if not url:
                print("No URL returned for uploaded audio")
                return ""

            url = SupabaseService.normalize_public_url(url)
            print(f"Audio uploaded successfully: {url}")
            return url
        except Exception:
            return ""

    @staticmethod
    async def save_conversation_turn(turn_data: dict):
        """
        Saves a conversation turn to the database. Normalizes audio_url and includes user_id if present.
        """
        try:
            record = {
                "interview_id": turn_data.get("interview_id"),
                "turn_index": turn_data.get("turn_index"),
                "speaker": turn_data.get("speaker"),
                "text_content": turn_data.get("text_content", ""),
                "audio_url": SupabaseService.normalize_public_url(turn_data.get("audio_url") or ""),
                "audio_duration_seconds": turn_data.get("audio_duration_seconds"),
            }
            if turn_data.get("user_id"):
                record["user_id"] = turn_data.get("user_id")

            print(f"Saving conversation turn: {record}")
            response = supabase_client.table("conversation_turns").insert(record).execute()
            return response.data if hasattr(response, "data") else {"message": "Turn saved successfully"}
        except Exception as e:
            print(f"Error saving conversation turn: {str(e)}")
            return {"error": {"message": str(e)}}
    
    @staticmethod
    async def get_all_conversation_turns(interview_id: str):
        """
        Retrieves all conversation turns for an interview, sorted by turn_index.
        """
        try:
            response = supabase_client.table("conversation_turns")\
                .select("*")\
                .eq("interview_id", interview_id)\
                .order("turn_index")\
                .execute()
            return response.data if hasattr(response, "data") else []
        except Exception as e:
            print(f"Error fetching conversation turns: {str(e)}")
            return []

    @staticmethod
    async def update_conversation_turn(turn_id: str, update_data: dict):
        """
        Updates a conversation turn record by id.
        """
        try:
            response = supabase_client.table("conversation_turns")\
                .update(update_data)\
                .eq("id", turn_id)\
                .execute()
            return response.data if hasattr(response, "data") else {"message": "updated"}
        except Exception as e:
            print(f"Error updating conversation turn: {str(e)}")
            return {"error": {"message": str(e)}}

    @staticmethod
    async def save_feedback(feedback: dict) -> dict:
        """
        Saves feedback for a specific interview. (Async to match callers)
        """
        try:
            response = supabase_client.table("feedback").insert({
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
supabase_service = SupabaseService()


