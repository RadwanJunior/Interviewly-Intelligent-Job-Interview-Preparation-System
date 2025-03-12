from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from app.services.resume_parser_service import resume_parser_service
from app.dependencies import get_current_user  # Now it will work

router = APIRouter()

@router.post("/parse-upload")
async def parse_uploaded_resume(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Uploads a resume and parses it immediately."""
    parsed_data = await resume_parser_service.parse_uploaded_resume(file, user["id"])

    if "error" in parsed_data:
        raise HTTPException(status_code=400, detail=parsed_data["error"])
    
    return parsed_data

@router.get("/parse-stored")
async def parse_stored_resume(file_path: str, user: dict = Depends(get_current_user)):
    """Parses a previously uploaded resume from Supabase."""
    parsed_data = await resume_parser_service.parse_stored_resume(file_path)

    if "error" in parsed_data:
        raise HTTPException(status_code=400, detail=parsed_data["error"])
    
    return parsed_data

