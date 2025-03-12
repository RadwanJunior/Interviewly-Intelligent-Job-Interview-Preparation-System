import os
import shutil
from pdfminer.high_level import extract_text
from docx import Document
from fastapi import UploadFile
import requests
from app.services.supabase_service import supabase_service  # Import Supabase service

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ResumeParserService:
    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """Extract text from a PDF file."""
        return extract_text(file_path)

    @staticmethod
    def parse_docx(file_path: str) -> str:
        """Extract text from a DOCX file."""
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    @staticmethod
    async def parse_uploaded_resume(file: UploadFile, user_id: str):
        """Uploads a resume to Supabase and then parses it."""
        # Upload file to Supabase
        upload_response = await supabase_service.upload_resume(user_id, file)
        if "error" in upload_response:
            return {"error": upload_response["error"]}
        
        # Fetch the public URL of the stored resume
        file_path = upload_response["file_path"]
        file_url = supabase_service.get_resume_url(file_path)
        
        # Download file from Supabase
        response = requests.get(file_url)
        if response.status_code != 200:
            return {"error": "Failed to fetch file from storage"}

        # Save the downloaded file temporarily
        temp_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(temp_path, "wb") as buffer:
            buffer.write(response.content)

        # Parse resume
        if file.filename.endswith(".pdf"):
            extracted_text = ResumeParserService.parse_pdf(temp_path)
        elif file.filename.endswith(".docx"):
            extracted_text = ResumeParserService.parse_docx(temp_path)
        else:
            os.remove(temp_path)  # Cleanup
            return {"error": "Unsupported file format"}

        os.remove(temp_path)  # Cleanup after parsing
        return {"filename": file.filename, "parsed_text": extracted_text}

    @staticmethod
    async def parse_stored_resume(file_path: str):
        """Fetches a stored resume from Supabase and parses it."""
        file_url = supabase_service.get_resume_url(file_path)

        # Download file from Supabase
        response = requests.get(file_url)
        if response.status_code != 200:
            return {"error": "Failed to fetch file from storage"}

        # Save file temporarily
        temp_path = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
        with open(temp_path, "wb") as buffer:
            buffer.write(response.content)

        # Parse resume
        if file_path.endswith(".pdf"):
            extracted_text = ResumeParserService.parse_pdf(temp_path)
        elif file_path.endswith(".docx"):
            extracted_text = ResumeParserService.parse_docx(temp_path)
        else:
            os.remove(temp_path)
            return {"error": "Unsupported file format"}

        os.remove(temp_path)
        return {"filename": os.path.basename(file_path), "parsed_text": extracted_text}

resume_parser_service = ResumeParserService()
