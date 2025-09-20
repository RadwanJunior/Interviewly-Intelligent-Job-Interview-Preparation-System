from pdfminer.high_level import extract_text
from docx import Document
from fastapi import UploadFile
import os
import shutil

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ResumeParserService:
    def parse_pdf(self, file_path: str) -> str:
        """Extract text from a PDF file."""
        return extract_text(file_path)

    def parse_docx(self, file_path: str) -> str:
        """Extract text from a DOCX file."""
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    async def parse_resume(self, file: UploadFile):
        """Handles resume file upload and parsing."""
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if file.filename.endswith(".pdf"):
            extracted_text = self.parse_pdf(file_path)
        elif file.filename.endswith(".docx"):
            extracted_text = self.parse_docx(file_path)
        else:
            os.remove(file_path)  # Cleanup
            return {"error": "Unsupported file format"}

        os.remove(file_path)  # Cleanup after parsing
        return {"filename": file.filename, "parsed_text": extracted_text}

resume_parser_service = ResumeParserService()