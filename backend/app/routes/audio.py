from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form, Depends, Request
from typing import Dict, Optional
from app.services.feedback_service import FeedbackService
from app.services.supabase_service import SupabaseService
import traceback

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
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = user.id
        
        # Upload the audio file using the FeedbackService
        # This will upload to Gemini and Supabase storage, and create user_responses record
        recording_data = await FeedbackService.upload_audio_file(
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
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error uploading audio: {str(e)}")

async def generate_feedback_background(interview_id: str, user_id: str):
    """
    Background task to generate feedback for an interview.
    Updates the feedback status and saves results to Supabase.
    """
    try:
        print(f"DEBUG: generate_feedback_background started for interview_id: {interview_id}, user_id: {user_id}")
        
        # Call the service to generate feedback
        await FeedbackService.generate_feedback(interview_id, user_id) 
        print(f"DEBUG: FeedbackService.generate_feedback completed successfully for interview_id: {interview_id}")
        
        # Update user_responses to mark as processed
        SupabaseService.update_user_responses_processed(interview_id)

        feedback_status[interview_id] = {
            "status": "completed",
        }
        print(f"DEBUG: Updated feedback_status to completed for interview_id: {interview_id}")
        
    except Exception as e:
        # Update status with error
        print(f"DEBUG: Error in generate_feedback_background for interview_id {interview_id}: {str(e)}")
        
        # Check if this is an API quota error and provide a better message
        error_str = str(e)
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str or "quota" in error_str.lower():
            error_message = "The AI service is currently experiencing high demand. Please wait a few minutes and try refreshing this page, or come back later."
        else:
            error_message = f"Unable to generate feedback: {error_str}"
        
        feedback_status[interview_id] = {
            "status": "error",
            "error": error_message
        }

@router.get("/status/{interview_id}")
async def check_feedback_status(interview_id: str, request: Request):
    """
    Check the status of feedback generation for an interview session.
    """
    try:
        print(f"DEBUG: check_feedback_status called for interview_id: {interview_id}")
        
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        print(f"DEBUG: User authentication result: {user is not None and 'error' not in user}")
        if not user or "error" in user:
            print(f"DEBUG: Authentication failed for interview_id: {interview_id}")
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Check if we have status information for this interview
        print(f"DEBUG: Checking feedback_status dictionary for interview_id: {interview_id}")
        print(f"DEBUG: Current feedback_status keys: {list(feedback_status.keys())}")
        
        if interview_id in feedback_status:
            status_result = feedback_status[interview_id]
            print(f"DEBUG: Found status in memory: {status_result}")
            return status_result
        
        # If no status found, check if feedback exists in Supabase
        print(f"DEBUG: No status in memory, checking Supabase for interview_id: {interview_id}")
        feedback = SupabaseService.get_feedback(interview_id)
        print(f"DEBUG: Supabase feedback result: {feedback}")
        
        if feedback:
            # Handle feedback whether it's a list or a dictionary
            if isinstance(feedback, list) and feedback:
                # If it's a list, use the first item
                result = {
                    "status": "completed",
                    "feedback_id": feedback[0]["id"] if "id" in feedback[0] else None
                }
                print(f"DEBUG: Returning completed status (list): {result}")
                return result
            elif isinstance(feedback, dict):
                # If it's a dictionary, use it directly
                result = {
                    "status": "completed",
                    "feedback_id": feedback.get("id")
                }
                print(f"DEBUG: Returning completed status (dict): {result}")
                return result
        
        print(f"DEBUG: No feedback found, returning not_started for interview_id: {interview_id}")
        return {"status": "not_started"}
        
    except Exception as e:
        print(f"DEBUG: Error in check_feedback_status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking feedback status: {str(e)}")

@router.get("/feedback/{interview_id}")
async def get_feedback(interview_id: str, request: Request):
    """
    Get generated feedback for an interview session.
    """
    try:
        print(f"DEBUG: get_feedback called for interview_id: {interview_id}")
        
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        print(f"DEBUG: User authentication result in get_feedback: {user is not None and 'error' not in user}")
        if not user or "error" in user:
            print(f"DEBUG: Authentication failed in get_feedback for interview_id: {interview_id}")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Check current status from our in-memory tracker
        print(f"DEBUG: Checking feedback_status in get_feedback for interview_id: {interview_id}")
        print(f"DEBUG: Current feedback_status keys in get_feedback: {list(feedback_status.keys())}")
        
        if interview_id in feedback_status:
            status = feedback_status[interview_id]["status"]
            print(f"DEBUG: Found status in memory: {status}")
            if status == "processing":
                print(f"DEBUG: Returning processing status for interview_id: {interview_id}")
                return {"status": "processing", "message": "Feedback generation in progress"}
            elif status == "error":
                error_msg = feedback_status[interview_id].get("error", "Unknown error")
                print(f"DEBUG: Returning error status: {error_msg}")
                return {"status": "error", "error": error_msg, "message": error_msg}
        
        # Try to fetch feedback from Supabase
        print(f"DEBUG: Fetching feedback from Supabase for interview_id: {interview_id}")
        feedback = SupabaseService.get_feedback(interview_id)
        print(f"DEBUG: Supabase feedback result in get_feedback: {feedback}")
        
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
        print(f"DEBUG: trigger_feedback_generation called for interview_id: {interview_id}")
        
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = user.id
        print(f"DEBUG: User authenticated successfully, user_id: {user_id}")
        
        # Check if feedback is already being generated
        if interview_id in feedback_status and feedback_status[interview_id]["status"] == "processing":
            return {
                "status": "already_processing",
                "message": "Feedback generation is already in progress"
            }
        
        # Check if feedback already exists in Supabase
        existing_feedback = SupabaseService.get_feedback(interview_id)
        print(f"DEBUG: Checked existing feedback: {existing_feedback}")
        if existing_feedback:
            print(f"DEBUG: Feedback already exists for interview_id: {interview_id}")
            return {
                "status": "already_exists",
                "message": "Feedback has already been generated for this interview"
            }
        
        # Update status
        print(f"DEBUG: Setting feedback status to processing for interview_id: {interview_id}")
        feedback_status[interview_id] = {
            "status": "processing"
        }
        
        # Start background task
        print(f"DEBUG: Starting background task for interview_id: {interview_id}, user_id: {user_id}")
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

@router.post("/generate_test/{interview_id}")
async def feedback_generation_test(interview_id: str, user_id: str):
    """
    Test endpoint to manually trigger feedback generation for an interview session.
    This is primarily for testing purposes and should not be used in production.
    """
    try:
        # Start background task
        feedback_result = await FeedbackService.generate_feedback(interview_id, user_id)
        
        return {
            "status": "success",
            "message": "Feedback generation test completed",
            "feedback": feedback_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in feedback generation test: {str(e)}")

@router.delete("/status/{interview_id}")
async def clear_feedback_status(interview_id: str, request: Request):
    """
    Clear the feedback status for an interview session (for debugging purposes).
    """
    try:
        print(f"DEBUG: clear_feedback_status called for interview_id: {interview_id}")
        
        # Get current user from Supabase authentication
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Remove from feedback_status dictionary
        if interview_id in feedback_status:
            del feedback_status[interview_id]
            print(f"DEBUG: Cleared status for interview_id: {interview_id}")
            return {"status": "success", "message": "Status cleared"}
        else:
            print(f"DEBUG: No status found to clear for interview_id: {interview_id}")
            return {"status": "success", "message": "No status to clear"}
            
    except Exception as e:
        print(f"DEBUG: Error in clear_feedback_status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing feedback status: {str(e)}")