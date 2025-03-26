from fastapi import APIRouter, UploadFile, Depends
from pydantic import BaseModel
import os
import shutil
from app.services.supabase_service import SupabaseService
from app.services.resume_parser_service import ResumeParserService
from fastapi import Depends, Header   

resume_router = APIRouter()

@resume_router.post("/upload")
async def upload_resume(
    file: UploadFile, 
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    """
    Uploads a new resume to Supabase Storage, parses it, 
    and inserts a record in the 'resumes' table.
    """
    print("current_user: ", current_user)
    #  check if current user is None
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    # 1. Upload file to Supabase Storage
    upload_response = await SupabaseService.upload_file(user_id, file, "resumes")
    print("upload_response: ", upload_response)
    if not upload_response:
        return upload_response

    # Reset file pointer after reading it during the upload.
    file.file.seek(0)

    # 2. Parse the file locally (the file is also stored in 'uploads' by default)
    #    Use the same logic from 'resume_parser_service.py' if needed. For example:
    local_path = os.path.join("uploads", file.filename)
    try:
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if file.filename.endswith(".pdf"):
            extracted_text = ResumeParserService.parse_pdf(local_path)
        elif file.filename.endswith(".docx"):
            extracted_text = ResumeParserService.parse_docx(local_path)
        else:
            os.remove(local_path)
            return {"error": "Unsupported file format"}
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

    # 3. Construct the public URL or signed URL for the file
    #    For example, if your file is at "{user_id}/{filename}":
    file_path = f"{user_id}/{file.filename}"
    url_response = SupabaseService.get_file_url(file_path, "resumes")
    print("url_response: ", url_response)
    print("url_response type", type(url_response))
    if "error" in url_response:
        return {"error": "Failed to get file URL"}

    # 4. Insert the record into the 'resumes' table
    create_response = SupabaseService.create_resume(user_id, url_response, extracted_text)
    return create_response

class UpdateResumeRequest(BaseModel):
    updated_text: str

@resume_router.put("/")
def update_extracted_text(
    request: UpdateResumeRequest,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    """
    Updates the extracted text of the current user's resume.
    """
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    print("user_id update: ", user_id)

    # Fetch the resume for the current user
    resume = SupabaseService.get_resume_table(user_id)
    if not resume or "error" in resume:
        return {"error": "No resume found for the current user"}

    # Update the extracted text
    resume_id = resume.data[0]['id']
    print("resume_id: ", resume_id)

    response = SupabaseService.update_resume(resume_id, request.updated_text)
    return response

# get extracted text of a resume
@resume_router.get("/")
def get_extracted_text(current_user: dict = Depends(SupabaseService.get_current_user)):
    """
    Returns the extracted text of a resume.
    """
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)

    response = SupabaseService.get_resume_table(user_id)
    return response

@resume_router.get("/{user_id}")
def get_extracted_text_user(user_id: str):
    """
    Returns the extracted text of a resume.
    """
    response = SupabaseService.get_resume_table(user_id)
    return response