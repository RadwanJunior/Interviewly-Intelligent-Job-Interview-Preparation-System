import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile
import traceback

load_dotenv()

SUPABASE_URL = "https://jdtuplcyczhtpljofwjg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdHVwbGN5Y3podHBsam9md2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5OTY5NDAsImV4cCI6MjA1MzU3Mjk0MH0._QXBx2r3JWwO67IV9-9n8WESaGjk2wv_J6BTpAJunEI"

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
    def upload_file(file: UploadFile, path: str, file_options: dict):
        """Uploads a file to a specified path in the Supabase storage bucket."""
        try:
            # Read the file content
            file_content = file.file.read()  # Use the 'file' object from FastAPI's UploadFile

            # Upload the file to Supabase storage
            response = supabase_client.storage.from_("resumes").upload(
                path=path,  # Use the path where the file will be stored
                file=file_content,
                options=file_options  # Pass options as 'options' not 'file_options'
            )

            # Check if the upload was successful
            if response.get("data"):
                # Return the file URL (you may need to generate the URL manually or from the response data)
                return {"message": "File uploaded successfully", "file_url": f"{SUPABASE_URL}/storage/v1/object/public/{path}"}
            else:
                return {"error": {"message": "File upload failed", "details": response.get("error")}}

        except Exception as e:
            return {"error": {"message": str(e)}}

supabase_service = SupabaseService()
