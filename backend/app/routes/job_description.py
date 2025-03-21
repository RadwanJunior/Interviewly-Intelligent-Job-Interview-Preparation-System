from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.supabase_service import supabase_service

router = APIRouter()

class JobDescriptionRequest(BaseModel):
    user_id: str
    job_title: str
    company_name: str
    location: str
    job_type: str
    description: str

@router.post("/")
async def create_job_description(request: JobDescriptionRequest):
    response = supabase_service.create_job_description(
        user_id=request.user_id,
        job_title=request.job_title,
        company_name=request.company_name,
        location=request.location,
        job_type=request.job_type,
        description=request.description
    )
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"]["message"])
    return response
