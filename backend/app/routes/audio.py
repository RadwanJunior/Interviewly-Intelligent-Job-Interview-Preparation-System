# =============================
# audio.py - FastAPI router for audio upload and feedback endpoints
# Handles audio uploads, feedback generation, and feedback status for interview sessions.
# =============================

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form, Depends, Request
from typing import Dict, Optional
from app.services.feedback_service import FeedbackService
from app.services.supabase_service import supabase_service
import traceback

# Create a router for all audio/feedback-related endpoints
router = APIRouter()
# Instantiate the feedback service, passing in the supabase service for DB operations
feedback_service = FeedbackService(supabase_service)

# A shared in-memory store for tracking feedback generation status (not persistent; for demo/testing only)
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
    is_last_question: bool = Form(False),
    mime_type: str = Form(...)
):
    """
    Upload an audio recording for a specific interview question.
    - Uploads the audio file to Gemini and Supabase storage
    - Optionally triggers feedback generation for the last question
    """
    try:
        # Get current user from Supabase authentication
        user = supabase_service.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = user.id
        
        # Upload the audio file using the FeedbackService
        # This will upload to Gemini and Supabase storage, and create user_responses record
        recording_data = await feedback_service.upload_audio_file(
            file, interview_id, question_id, question_text, question_order, user_id, mime_type
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
            
    except HTTPException as exc:
        raise exc
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error uploading audio: {str(e)}")

async def generate_feedback_background(interview_id: str, user_id: str):
    """
    Background task to generate feedback for an interview.
    Updates the feedback status and saves results to Supabase.
    """
    try:
        # Call the service to generate feedback
        await feedback_service.generate_feedback(interview_id, user_id) 
        # Update user_responses to mark as processed
        supabase_service.update_user_responses_processed(interview_id)

        feedback_status[interview_id] = {
            "status": "completed",
        }
        
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
        user = supabase_service.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Check if we have status information for this interview
        if interview_id in feedback_status:
            return feedback_status[interview_id]
        
        # If no status found, check if feedback exists in Supabase
        feedback = supabase_service.get_feedback(interview_id)
        
        if feedback:
            # Handle feedback whether it's a list or a dictionary
            if isinstance(feedback, list) and feedback:
                # If it's a list, use the first item
                return {
                    "status": "completed",
                    "feedback_id": feedback[0]["id"] if "id" in feedback[0] else None
                }
            elif isinstance(feedback, dict):
                # If it's a dictionary, use it directly
                return {
                    "status": "completed",
                    "feedback_id": feedback.get("id")
                }
        
        return {"status": "not_started"}
        
    except HTTPException as exc:
        raise exc
    except Exception as e:
        print(f"DEBUG: Error in check_feedback_status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking feedback status: {str(e)}")

@router.get("/feedback/{interview_id}")
async def get_feedback(interview_id: str, request: Request):
    """
    Get generated feedback for an interview session.
    """
    try:
        # Get current user from Supabase authentication
        user = supabase_service.get_current_user(request)
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
        feedback = supabase_service.get_feedback(interview_id)
        
        if not feedback:
            return {
                "status": "not_found",
                "message": "No feedback found for this interview"
            }
        
        # Handle both list and dictionary return types
        if isinstance(feedback, list) and feedback:
            return {
                "status": "success",
                "feedback": feedback[0].get("feedback_data")
            }
        else:
            return {
                "status": "success",
                "feedback": feedback.get("feedback_data")
            }
            
    except HTTPException as exc:
        raise exc
    except Exception as e:
        print(f"DEBUG: Error in get_feedback: {str(e)}")
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
        user = supabase_service.get_current_user(request)
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
        
    except HTTPException as exc:
        raise exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering feedback generation: {str(e)}")

@router.post("/generate_test/{interview_id}")
async def feedback_generation_test(interview_id: str, user_id: str):
    """
    Test endpoint to manually trigger feedback generation for an interview session.
    This is primarily for testing purposes and should not be used in production.
    """
    try:
        # Start background task
        feedback_result = await feedback_service.generate_feedback(user_id, interview_id)
        
        return {
            "status": "success",
            "message": "Feedback generation test completed",
            "feedback": feedback_result
        }
        
    except HTTPException as exc:
        raise exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in feedback generation test: {str(e)}")
