from fastapi import APIRouter, UploadFile, Depends
from pydantic import BaseModel
from app.services.supabase_service import SupabaseService

job_router = APIRouter()

@job_router.post("/upload")
async def upload_job(
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


    # 3. Construct the public URL or signed URL for the file
    #    For example, if your file is at "{user_id}/{filename}":
    file_path = f"{user_id}/{file.filename}"
    url_response = SupabaseService.get_file_url(file_path)
    if "error" in url_response:
        return url_response

    file_url = url_response["URL"] if "URL" in url_response else file_path

    # 4. Insert the record into the 'resumes' table
    create_response = SupabaseService.create_job_description(user_id, job_title, company_name, location, job_type, description)
    return create_response