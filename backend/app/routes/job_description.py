from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.workflow_service import WorkflowService
from app.services.supabase_service import supabase_service

router = APIRouter()
workflow_service = WorkflowService()

class JobDescriptionRequest(BaseModel):
    job_title: str
    company_name: str
    location: str
    job_type: str
    description: str

@router.post("/")
async def create_job_description(
    request: JobDescriptionRequest,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}
    user_id = getattr(current_user, "id", None)
    response = workflow_service.create_job_description(
        user_id=user_id,
        job_title=request.job_title,
        company_name=request.company_name,
        location=request.location,
        job_type=request.job_type,
        description=request.description
    )
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"]["message"])
    return response
