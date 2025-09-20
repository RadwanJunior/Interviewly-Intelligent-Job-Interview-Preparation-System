from fastapi import APIRouter, UploadFile, Depends
from pydantic import BaseModel
from app.services.workflow_service import WorkflowService
from app.services.supabase_service import supabase_service

resume_router = APIRouter()
workflow_service = WorkflowService()

@resume_router.post("/upload")
async def upload_resume(
    file: UploadFile, 
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """
    Uploads a new resume to Supabase Storage, parses it, 
    and inserts a record in the 'resumes' table.
    """
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    return await workflow_service.upload_resume(user_id, file)

class UpdateResumeRequest(BaseModel):
    updated_text: str

@resume_router.put("/")
def update_extracted_text(
    request: UpdateResumeRequest,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """
    Updates the extracted text of the current user's resume.
    """
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    return workflow_service.update_extracted_text(user_id, request.updated_text)

# gett extracted text of a resume
@resume_router.get("/")
def get_extracted_text(current_user: dict = Depends(supabase_service.get_current_user)):
    """
    Returns the extracted text of a resume.
    """
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    return workflow_service.get_resume_text(user_id)

@resume_router.get("/{user_id}")
def get_extracted_text_user(user_id: str):
    """
    Returns the extracted text of a resume.
    """
    return workflow_service.get_resume_text(user_id)