import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form, Depends, Request
from typing import Dict, Optional
from backend.app.services.feedback_service import FeedbackService
from backend.app.services.supabase_service import SupabaseService

router = APIRouter()

# A shared in-memory store for tracking feedback generation status
feedback_status = {}

@router.post("/upload")
async def upload_audio(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    interview_id: str = Form(...),
    question_id: str = Form(...),
    question_text: str = Form(...),
    question_order: int = Form(...),
    is_last_question: bool = Form(False)
):
    """
    Upload an audio recording for a specific interview question.
    - Uploads the audio file to Gemini and Supabase storage
    - Optionally triggers feedback generation for the last question
    """
    try:
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = user.id
        
        # Upload the audio file using the FeedbackService
        # This will upload to Gemini and Supabase storage, and create user_responses record
        recording_data = await FeedbackService.upload_audio_file(
            file, interview_id, question_id, question_text, question_order, user_id
        )
        
        # Check if this is the last question
        if is_last_question:
            # Start background task to generate feedback
            background_tasks.add_task(
                generate_feedback_background,
                interview_id=interview_id,
                user_id=user_id
            )
            
            # Update feedback status in memory
            feedback_status[interview_id] = {
                "status": "processing"
            }
            
            return {
                "status": "success",
                "message": "Audio uploaded successfully. Feedback generation started.",
                "recording": recording_data
            }
        else:
            # Just record the answer without generating feedback yet
            return {
                "status": "success",
                "message": "Audio uploaded successfully.",
                "recording": recording_data
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading audio: {str(e)}")

async def generate_feedback_background(interview_id: str, user_id: str):
    """
    Background task to generate feedback for an interview.
    Updates the feedback status and saves results to Supabase.
    """
    try:
        # Call the service to generate feedback
        feedback_result = await FeedbackService.generate_feedback(interview_id, user_id)
        
        # Store feedback in Supabase
        feedback_data = {
            "interview_id": interview_id,
            "feedback_data": feedback_result,
            "user_id": user_id
        }
        
        # Insert feedback into Supabase
        feedback_id = SupabaseService.insert_feedback(feedback_data)
        
        # Update status in our memory tracker
        feedback_status[interview_id] = {
            "status": "completed",
            "feedback_id": feedback_id
        }
        
        # Update user_responses to mark as processed
        SupabaseService.update_user_responses_processed(interview_id)
        
    except Exception as e:
        # Update status with error
        feedback_status[interview_id] = {
            "status": "error",
            "error": str(e)
        }

@router.get("/status/{interview_id}")
async def check_feedback_status(interview_id: str, request: Request):
    """
    Check the status of feedback generation for an interview session.
    """
    try:
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Check if we have status information for this interview
        if interview_id in feedback_status:
            return feedback_status[interview_id]
        
        # If no status found, check if feedback exists in Supabase
        feedback = SupabaseService.get_feedback(interview_id)
        
        if feedback:
            return {
                "status": "completed",
                "feedback_id": feedback["id"]
            }
        
        return {"status": "not_started"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking feedback status: {str(e)}")

@router.get("/feedback/{interview_id}")
async def get_feedback(interview_id: str, request: Request):
    """
    Get generated feedback for an interview session.
    """
    try:
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Check current status from our in-memory tracker
        if interview_id in feedback_status:
            status = feedback_status[interview_id]["status"]
            if status == "processing":
                return {"status": "processing", "message": "Feedback generation in progress"}
            elif status == "error":
                error_msg = feedback_status[interview_id].get("error", "Unknown error")
                return {"status": "error", "message": f"Error generating feedback: {error_msg}"}
        
        # Try to fetch feedback from Supabase
        feedback = SupabaseService.get_feedback(interview_id)
        
        if not feedback:
            return {
                "status": "not_found",
                "message": "No feedback found for this interview"
            }
        
        return {
            "status": "success",
            "feedback": feedback["feedback_data"]
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving feedback: {str(e)}")

@router.post("/generate/{interview_id}")
async def trigger_feedback_generation(
    interview_id: str,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Manually trigger feedback generation for an interview session.
    """
    try:
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = user.id
        
        # Check if feedback is already being generated
        if interview_id in feedback_status and feedback_status[interview_id]["status"] == "processing":
            return {
                "status": "already_processing",
                "message": "Feedback generation is already in progress"
            }
        
        # Update status
        feedback_status[interview_id] = {
            "status": "processing"
        }
        
        # Start background task
        background_tasks.add_task(
            generate_feedback_background,
            interview_id=interview_id,
            user_id=user_id
        )
        
        return {
            "status": "success",
            "message": "Feedback generation started"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering feedback generation: {str(e)}")
