import os
from typing import Union
from fastapi import UploadFile
from pydantic import BaseModel
import pdfplumber
import docx
from pathlib import Path

UPLOAD_DIR = "backend/uploads/job_descriptions"

class JobDescription(BaseModel):
    id: str
    filename: str
    content: str
    parsed_text: str

async def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file to uploads directory"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    return file_path

def parse_job_description(file_path: str) -> str:
    """Parse job description file and extract text"""
    ext = Path(file_path).suffix.lower()
    
    try:
        if ext == ".pdf":
            return parse_pdf(file_path)
        elif ext == ".docx":
            return parse_docx(file_path)
        elif ext == ".txt":
            return parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    except Exception as e:
        raise ValueError(f"Error parsing file: {str(e)}")

def parse_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text.strip()

def parse_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    doc = docx.Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs]).strip()

def parse_txt(file_path: str) -> str:
    """Read text from TXT file"""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()

async def process_job_description(file: UploadFile) -> JobDescription:
    """Process uploaded job description file"""
    file_path = await save_uploaded_file(file)
    parsed_text = parse_job_description(file_path)
    
    return JobDescription(
        id=str(Path(file_path).stem),
        filename=file.filename,
        content=file.content_type,
        parsed_text=parsed_text
    )
