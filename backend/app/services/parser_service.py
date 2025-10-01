
# Import libraries for PDF and DOCX parsing
from pdfminer.high_level import extract_text
from docx import Document
from fastapi import UploadFile
import os
import shutil


# Directory to temporarily store uploaded files
UPLOAD_DIR = "uploads"
# Ensure the upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ResumeParserService:
    """
    Service for parsing resume files (PDF and DOCX) and extracting their text content.
    """
    def parse_pdf(self, file_path: str) -> str:
        # Extract text from a PDF file using pdfminer
        return extract_text(file_path)

    def parse_docx(self, file_path: str) -> str:
        # Extract text from a DOCX file using python-docx
        doc = Document(file_path)
        # Join all paragraph texts with newlines
        return "\n".join([para.text for para in doc.paragraphs])

    async def parse_resume(self, file: UploadFile):
        # Handles the upload and parsing of a resume file (PDF or DOCX)
        # file: FastAPI UploadFile object
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        # Save the uploaded file to disk for parsing
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Determine file type and parse accordingly
        if file.filename.endswith(".pdf"):
            extracted_text = self.parse_pdf(file_path)
        elif file.filename.endswith(".docx"):
            extracted_text = self.parse_docx(file_path)
        else:
            # Unsupported file type, clean up and return error
            os.remove(file_path)  # Cleanup
            return {"error": "Unsupported file format"}

        # Remove the file after parsing to keep uploads directory clean
        os.remove(file_path)  # Cleanup after parsing
        # Return the filename and extracted text
        return {"filename": file.filename, "parsed_text": extracted_text}


# Singleton instance for use throughout the app
resume_parser_service = ResumeParserService()