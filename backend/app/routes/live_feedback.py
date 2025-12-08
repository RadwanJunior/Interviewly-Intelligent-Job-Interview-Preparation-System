from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends
from app.services.supabase_service import supabase_service
from app.services.feedback_live_service import feedback_live_service, feedback_status
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
        user = supabase_service.get_current_user(request)
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
        existing_feedback = supabase_service.get_feedback(interview_id)
        if existing_feedback:
            return {
                "status": "exists",
                "message": "Feedback has already been generated for this interview"
            }

        # Update in-memory status tracker
        feedback_status[interview_id] = {"status": "processing"}
        
        # Start the background task
        background_tasks.add_task(
            feedback_live_service.generate_live_feedback,
            interview_id=interview_id,
            user_id=user_id
        )
        
        logging.info(f"Started live feedback generation task for interview {interview_id}")
        
        return {
            "status": "success", 
            "message": "Live feedback generation started."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="An internal error has occurred")

@router.get("/status/{interview_id}")
async def get_feedback_status(
    interview_id: str,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """Get the current status of feedback generation for an interview"""
    try:
        logging.info(f"[{interview_id}] Checking feedback status")
        
        # Check database for existing feedback
        feedback_result = supabase_service.get_feedback(interview_id)
        
        if feedback_result and feedback_result.get("data"):
            logging.info(f"[{interview_id}] Feedback found in database")
            return {
                "status": "completed",
                "message": "Feedback is ready"
            }
        
        # Check if interview exists and its status
        interview_result = supabase_service.get_interview_session(interview_id)
        if not interview_result or not interview_result.get("data"):
            logging.warning(f"[{interview_id}] Interview not found")
            return {
                "status": "not_started",
                "message": "Interview not found"
            }
        
        interview_data = interview_result.get("data")[0]
        interview_status = interview_data.get("status")
        completed_at = interview_data.get("completed_at")
        
        logging.info(f"[{interview_id}] Interview status: {interview_status}, completed_at: {completed_at}")
        
        if interview_status == "completed" and completed_at:
            # Interview is completed, feedback should be processing or will be soon
            return {
                "status": "processing",
                "message": "Generating feedback..."
            }
        
        # Interview not completed yet
        return {
            "status": "not_started",
            "message": "Interview has not been completed yet"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": "An internal error has occurred."
        }

@router.get("/feedback/{interview_id}")
async def get_live_feedback(
    interview_id: str,
    request: Request
):
    """Get generated live feedback for an interview."""
    try:
        # Authenticate the user
        user = supabase_service.get_current_user(request)
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
        feedback = supabase_service.get_feedback(interview_id)

        if isinstance(feedback, dict) and "error" in feedback:
            error_msg = feedback["error"].get("message", "Unknown error")
            logging.error(f"Error from supabase_service.get_feedback: {error_msg}")
            return {
                "status": "error",
                "message": "Error generating feedback. Please try again later."
        }
        
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
        elif isinstance(feedback, dict) and "error" in feedback:
            logging.error(f"Database error while retrieving feedback: {feedback['error'].get('message', repr(feedback['error']))}")
            return {
                "status": "error",
                "message": "Failed to retrieve feedback."
            }
        else:
            return {
                "status": "success",
                "feedback": feedback.get("feedback_data")
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail="internal error has occurred")
