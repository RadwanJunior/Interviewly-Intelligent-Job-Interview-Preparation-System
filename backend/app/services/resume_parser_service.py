# Import necessary libraries for file handling and text extraction
from pdfminer.high_level import extract_text  # For extracting text from PDF files
from docx import Document                    # For reading .docx files
from fastapi import UploadFile               # For handling file uploads in FastAPI
import os                                   # For file system operations
import shutil                               # For file copying

# Define the directory where uploaded files will be temporarily stored
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)  # Create the directory if it doesn't exist

class ResumeParserService:
    """
    Service class responsible for parsing uploaded resumes (PDF or DOCX).
    """

    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """
        Extracts and returns text from a PDF file.

        :param file_path: Path to the PDF file
        :return: Extracted text as a string
        """
        return extract_text(file_path)

    @staticmethod
    def parse_docx(file_path: str) -> str:
        """
        Extracts and returns text from a DOCX file.

        :param file_path: Path to the DOCX file
        :return: Extracted text as a string
        """
        doc = Document(file_path)
        # Concatenate all paragraphs into a single string
        return "\n".join([para.text for para in doc.paragraphs])

    @staticmethod
    async def parse_resume(file: UploadFile):
        """
        Handles the resume file upload, determines the file type, 
        extracts the text content, and performs cleanup.

        :param file: The uploaded resume file
        :return: A dictionary with the filename and extracted text,
                 or an error message if the file format is unsupported
        """
        # Define the path to temporarily save the uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        # Save the uploaded file locally
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Check the file extension and parse accordingly
        if file.filename.endswith(".pdf"):
            extracted_text = ResumeParserService.parse_pdf(file_path)
        elif file.filename.endswith(".docx"):
            extracted_text = ResumeParserService.parse_docx(file_path)
        else:
            os.remove(file_path)  # Remove unsupported file
            return {"error": "Unsupported file format"}

        os.remove(file_path)  # Clean up the uploaded file after parsing

        # Return the parsed text along with the filename
        return {"filename": file.filename, "parsed_text": extracted_text}

# Instantiate the resume parser service
resume_parser_service = ResumeParserService()
