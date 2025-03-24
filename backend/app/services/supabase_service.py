import os
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile, HTTPException, Request

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
            print(response)
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
            print("response: ", response.user)
            return response.user
        except Exception as e:
            return {"error": {"message": str(e)}}
    @staticmethod
    def get_file_url(file_path: str, bucket_name: str = "public"):
        """Generates a public URL for a file in Supabase Storage."""
        try:
            print("file_path: ", file_path)
            print("bucket_name: ", bucket_name)
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
            print(f"Updating resume with ID: {resume_id}, extracted_text: {extracted_text}")
            response = supabase_client.table("resumes").update({
                "extracted_text": extracted_text
            }).eq("id", resume_id).execute()
            print(f"Supabase response: {response}")
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
    def create_interview_session(user_id: str, resume_id: str, job_description_id: str, questions: list) -> dict:
        """
        Inserts a new interview session record into the 'interview_sessions' table.
        """
        try:
            response = supabase_client.table("interview_sessions").insert({
                "user_id": user_id,
                "resume_id": resume_id,
                "job_description_id": job_description_id,
                "interview_questions": questions,
                "status": "pending"
            }).execute()
            return response
        except Exception as e:
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
        Retrieves the latest interview session record for a user from the 'interview_sessions' table.
        """
        try:
            response = supabase_client.table("interview_sessions").select("*").eq("user_id", user_id).order("created_at", ascending=False).limit(1).execute()
            return response
        except Exception as e:
            return {"error": {"message": str(e)}}
        
    @staticmethod
    def get_interview_questions(session_id: str) -> dict:
        """
        Retrieves the interview questions for a specific session from the 'interview_sessions' table.
        """
        try:
            response = supabase_client.table("interview_sessions").select("interview_questions").eq("id", session_id).execute()
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



supabase_service = SupabaseService()
