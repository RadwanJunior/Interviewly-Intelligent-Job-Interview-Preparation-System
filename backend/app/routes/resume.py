"""
Resume Router: Handles uploading, updating, and retrieving user resumes. Integrates with Supabase for storage and workflow service for parsing.
"""
from fastapi import APIRouter, UploadFile, Depends, HTTPException, status
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
    Upload a new resume for the current user.

    Args:
        file (UploadFile): The resume file to upload.
        current_user (dict): The authenticated user.

    Returns:
        dict: Result of the upload operation or error message.

    Raises:
        HTTPException: If the user is unauthorized.
    """
    # Check for valid user authentication
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
    Update the extracted text of the current user's resume.

    Args:
        request (UpdateResumeRequest): The updated resume text.
        current_user (dict): The authenticated user.

    Returns:
        dict: Result of the update operation or error message.

    Raises:
        HTTPException: If the user is unauthorized.
    """
    # Check for valid user authentication
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    return workflow_service.update_extracted_text(user_id, request.updated_text)

# Get the extracted text of the current user's resume
@resume_router.get("/")
def get_extracted_text(current_user: dict = Depends(supabase_service.get_current_user)):
    """
    Get the extracted text of the current user's resume.

    Args:
        current_user (dict): The authenticated user.

    Returns:
        dict: The extracted resume text or error message.

    Raises:
        HTTPException: If the user is unauthorized.
    """
    # Check for valid user authentication
    if not current_user or not getattr(current_user, "id", None):
        return {"error": "Unauthorized or invalid user"}

    user_id = getattr(current_user, "id", None)
    return workflow_service.get_resume_text(user_id)

@resume_router.get("/{user_id}")
def get_extracted_text_user(user_id: str):
    """
    Get the extracted text of a resume for a specific user.

    Args:
        user_id (str): The user ID.

    Returns:
        dict: The extracted resume text.
    """
    return workflow_service.get_resume_text(user_id)