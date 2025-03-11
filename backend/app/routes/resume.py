from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.resume_parser_service import resume_parser_service  # Import the service

router = APIRouter()

@router.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    """Endpoint to handle resume parsing."""
    parsed_data = await resume_parser_service.parse_resume(file)
    
    if "error" in parsed_data:
        raise HTTPException(status_code=400, detail=parsed_data["error"])
    
    return parsed_data

