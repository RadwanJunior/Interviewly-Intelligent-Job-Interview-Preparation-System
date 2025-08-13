from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends
from app.services.supabase_service import SupabaseService
from app.services.feedback_live_service import FeedbackLiveService, feedback_status
import logging

router = APIRouter()

@router.post("/generate_live_feedback/{interview_id}")
async def trigger_live_feedback_generation(
    interview_id: str,
    background_tasks: BackgroundTasks,
    request: Request
):
    """ Triggers feedback generation for a COMPLETED LIVE interview. """
    try:
        # Authenticate the user
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        user_id = user.id
        
        # Check if feedback is already being generated
        if interview_id in feedback_status and feedback_status[interview_id].get("status") == "processing":
            return {
                "status": "already_processing",
                "message": "Feedback generation is already in progress"
            }
            
        # Check if feedback already exists
        existing_feedback = SupabaseService.get_feedback(interview_id)
        if existing_feedback:
            return {
                "status": "exists",
                "message": "Feedback has already been generated for this interview"
            }

        # Update in-memory status tracker
        feedback_status[interview_id] = {"status": "processing"}
        
        # Start the background task
        background_tasks.add_task(
            FeedbackLiveService.generate_live_feedback,
            interview_id=interview_id,
            user_id=user_id
        )
        
        logging.info(f"Started live feedback generation task for interview {interview_id}")
        
        return {
            "status": "success", 
            "message": "Live feedback generation started."
        }
        
    except Exception as e:
        logging.error(f"Error triggering live feedback generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{interview_id}")
async def check_live_feedback_status(
    interview_id: str,
    request: Request
):
    """Check the status of live feedback generation."""
    try:
        # Authenticate the user
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Check in-memory status first
        if interview_id in feedback_status:
            return feedback_status[interview_id]
            
        # If not in memory, check if feedback exists in database
        feedback = SupabaseService.get_feedback(interview_id)
        if feedback:
            return {
                "status": "completed",
                "message": "Feedback has been generated"
            }
            
        # If no status information is found
        return {
            "status": "not_started",
            "message": "Feedback generation has not been started"
        }
        
    except Exception as e:
        logging.error(f"Error checking feedback status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feedback/{interview_id}")
async def get_live_feedback(
    interview_id: str,
    request: Request
):
    """Get generated live feedback for an interview."""
    try:
        # Authenticate the user
        user = SupabaseService.get_current_user(request)
        if not user or "error" in user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Check current status
        if interview_id in feedback_status:
            status = feedback_status[interview_id].get("status")
            if status == "processing":
                return {
                    "status": "processing", 
                    "message": "Feedback generation in progress"
                }
            elif status == "error":
                error_msg = feedback_status[interview_id].get("error", "Unknown error")
                return {
                    "status": "error", 
                    "message": f"Error generating feedback: {error_msg}"
                }
        
        # Try to fetch feedback from database
        feedback = SupabaseService.get_feedback(interview_id)
        
        if not feedback:
            return {
                "status": "not_found",
                "message": "No feedback found for this interview"
            }
        
        # Return feedback data based on format
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
        logging.error(f"Error retrieving feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))