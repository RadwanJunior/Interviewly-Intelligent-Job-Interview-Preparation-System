import os
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    def get_user_from_token(access_token: str):
        """Fetches user details using an access token."""
        try:
            user = supabase_client.auth.get_user(access_token)
            if user:
                return user
            return None
        except Exception as e:
            return None
    
    @staticmethod
    async def upload_resume(user_id: str, file: UploadFile):
        """Uploads a resume to Supabase Storage under the 'resumes' bucket."""
        file_path = f"{user_id}/{file.filename}"
        file_bytes = await file.read()
        
        response = supabase_client.storage.from_("resumes").upload(file_path, file_bytes, {"content-type": file.content_type})
        if response.error:
            return {"error": response.error.message}
        
        return {"message": "File uploaded successfully", "file_path": file_path}

    @staticmethod
    def list_resumes(user_id: str):
        """Lists all resumes stored for a given user."""
        response = supabase_client.storage.from_("resumes").list(user_id)
        if response.error:
            return {"error": response.error.message}
        
        return response.data

    @staticmethod
    def get_resume_url(file_path: str):
        """Generates a public URL for a stored resume."""
        return supabase_client.storage.from_("resumes").get_public_url(file_path)

supabase_service = SupabaseService()
