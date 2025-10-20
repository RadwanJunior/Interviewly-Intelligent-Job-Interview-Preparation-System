from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.supabase_service import supabase_service, SupabaseService

router = APIRouter()

class UserResponseRequest(BaseModel):
    interview_id: str
    question_id: str
    response_text: str  # storing text, you can extend later with audio_url, gemini_file_id, etc.

@router.post("/")
async def create_user_response(
    request: UserResponseRequest,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized or invalid user")

    user_id = getattr(current_user, "id", None)

    response = await supabase_service.insert_user_response({
        "interview_id": request.interview_id,
        "question_id": request.question_id,
        "response_text": request.response_text,
        "user_id": user_id,
        "processed": False
    })

    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"]["message"])
    
    return response


@router.get("/{interview_id}")
async def get_user_responses(
    interview_id: str,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized or invalid user")

    responses = supabase_service.get_user_responses(interview_id)

    if "error" in responses:
        raise HTTPException(status_code=500, detail=responses["error"]["message"])
    
    return responses
