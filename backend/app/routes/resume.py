from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from app.services.resume_parser_service import resume_parser_service
from app.dependencies import get_current_user  # Now it will work
from app.services.supabase_service import supabase_service

router = APIRouter()

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Endpoint to upload a resume file to the Supabase storage 'resumes' bucket.
    """

    # Define the path where the file will be stored (e.g., 'user/<user_id>/resumes/<filename>.pdf')
    file_path = f"user/{current_user['id']}/resumes/{file.filename}"
    
    # Set the file options (cache-control, content-type, upsert)
    file_options = {
        "cache-control": "3600",  # Cache for 1 hour
        "content-type": file.content_type,  # Correct MIME type for the file
        "upsert": "false"  # Don't overwrite existing files
    }

    # Call the Supabase service to upload the file
    try:
        response = supabase_service.upload_file(file, file_path, file_options)
        if "error" in response:
            raise HTTPException(status_code=400, detail=response["error"]["message"])
        
        return {"message": "Resume uploaded successfully", "file_url": response["file_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
