from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from app.services.supabase_service import SupabaseService
from app.services.conversation_service import ConversationService
import logging

router = APIRouter()

@router.get("/turns/{interview_id}")
async def get_conversation_turns(
    interview_id: str,
    request: Request
):
    """
    Get all conversation turns for an interview.
    """
    # Check authentication
    user = SupabaseService.get_current_user(request)
    if not user or "error" in user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    try:
        # Fetch all turns
        turns = await SupabaseService.get_all_conversation_turns(interview_id)
        if not turns:
            return {"status": "success", "turns": [], "message": "No conversation turns found"}
            
        # Return turns sorted by turn_index
        return {
            "status": "success",
            "turns": sorted(turns, key=lambda x: x.get("turn_index", 0)),
            "count": len(turns)
        }
    except Exception as e:
        logging.error(f"Error fetching conversation turns: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching conversation: {str(e)}")

@router.post("/process-turn/{interview_id}")
async def process_turn(
    interview_id: str,
    turn_data: dict,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Process and store a single conversation turn.
    """
    # Check authentication
    user = SupabaseService.get_current_user(request)
    if not user or "error" in user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    user_id = user.id
    
    try:
        # Process the turn in the background
        background_tasks.add_task(
            ConversationService.process_turn_audio,
            turn_data=turn_data,
            interview_id=interview_id,
            user_id=user_id,
            turn_index=turn_data.get("turn_index", 0)
        )
        
        return {
            "status": "processing",
            "message": "Processing conversation turn in the background"
        }
    except Exception as e:
        logging.error(f"Error processing conversation turn: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing turn: {str(e)}")