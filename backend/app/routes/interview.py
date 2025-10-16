# Imports fastapi modules to be used. APIRouter to create a router object for all my interview related endpoints which are registered on this router.
# Import Dpeends which injects dependencies in FastAPI. In this file used to inject the currently autheticated user.
# HTTP Exception to raise HTTP errors with specific status codes and messages.
# BackgroundTasks to run tasks in the background after returning a response to the client (to us).
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
# BaseModel is used to define and validate the structure of my data that my API expects or returns.
from pydantic import BaseModel, Field
# Import the InterviewService class from my services module. This class contains the business logic for handling interview-related operations.
from app.services.interview_service import InterviewService
# Import Supabase service to interact with the database and storage.
from app.services.supabase_service import supabase_service
from app.services.rag_service import rag_service, RAGStatus
# provides support for writing non blocking code using the async and await syntax
import asyncio
import logging
from google.api_core import exceptions as google_exceptions

router = APIRouter()
interview_service = InterviewService()

class CreateInterviewRequest(BaseModel):
    """Request body for creating an interview session."""
    job_description_id: str
    type: str = Field(default="text", description="Interview type: 'text' or 'call'")


async def generate_questions_task(
    session_id: str,
    resume_text: str,
    job_title: str,
    job_description: str,
    company_name: str,
    location: str,
    interview_type: str
):
    """
    Background task to generate questions after RAG enhancement completes.
    This runs asynchronously and does not block the HTTP response.
    """
    try:
        logging.info(f"[Interview] Starting question generation task for interview {session_id}")
        
        # Wait for RAG enhancement with timeout
        rag_result = await rag_service.wait_for_enhancement(
            interview_id=session_id,
            timeout=120  # 2 minute timeout
        )
        
        # Get enhanced prompt if available
        enhanced_prompt = None
        if rag_result.get("status") == "success":
            enhanced_prompt = rag_result.get("enhanced_prompt")
            logging.info(f"[Interview] Using enhanced prompt for interview {session_id}")
        else:
            logging.warning(
                f"[Interview] RAG enhancement did not complete successfully: {rag_result.get('status')}. "
                f"Falling back to basic questions."
            )
            # Update status to processing while generating questions
            await supabase_service.update_interview_status(session_id, "processing")

        
        # Generate questions with or without enhanced prompt
        questions_list = interview_service.generate_questions(
            resume_text, job_title, job_description, company_name, location,
            enhanced_prompt=enhanced_prompt
        )
        
        if not questions_list:
            logging.error(f"[Interview] Failed to generate questions for interview {session_id}")
            await supabase_service.update_interview_status(session_id, "failed")
            return
        
        # Store questions
        question_records = []
        for idx, q in enumerate(questions_list, start=1):
            question_text = q.get("question")
            if question_text:
                question_records.append({
                    "interview_id": session_id,
                    "question": question_text,
                    "order": idx
                })
        
        if not question_records:
            logging.error(f"[Interview] No valid questions generated for interview {session_id}")
            await supabase_service.update_interview_status(session_id, "failed")
            return
        
        # Insert questions
        question_insert_response = supabase_service.insert_interview_questions(question_records)
        if "error" in question_insert_response or not question_insert_response.data:
            logging.error(f"[Interview] Failed to insert questions: {question_insert_response}")
            await supabase_service.update_interview_status(session_id, "failed")
            return
        
        # Use the async method to update status to ready - THIS IS THE KEY FIX
        status_update_result = await supabase_service.update_interview_status(session_id, "ready")
        
        if not status_update_result.get("success"):
            logging.error(f"[Interview] Failed to update interview status to ready: {status_update_result}")
            await supabase_service.update_interview_status(session_id, "failed")
            return
        
        logging.info(f"[Interview] Successfully generated {len(question_records)} questions for interview {session_id} and updated status to ready")
        
    except google_exceptions.ResourceExhausted as e:
        logging.error(f"[Interview] Quota exceeded during question generation for {session_id}: {str(e)}")
        await supabase_service.update_interview_status(session_id, "quota_exceeded")
    except Exception as e:
        logging.error(f"[Interview] Error in question generation task for {session_id}: {str(e)}")
        await supabase_service.update_interview_status(session_id, "failed")


@router.post("/create")
async def create_interview_session(
    request_data: CreateInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user)
):
    """
    Creates an interview session and initiates RAG enhancement + question generation.
    Returns immediately with interview session info - questions are generated in background.
    Frontend should poll /interview/status/{session_id} to check when ready.
    """
    # Validation
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    # Fetch resume and job data
    resume_response = supabase_service.get_resume_table(user_id)
    if "error" in resume_response or not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_record = resume_response.data[0]
    
    job_response = supabase_service.get_job_description(request_data.job_description_id)
    if "error" in job_response or not job_response.data:
        raise HTTPException(status_code=404, detail="Job description not found")
    job_record = job_response.data

    # Extract data
    resume_text = getattr(resume_record, "extracted_text", None)
    job_title = getattr(job_record, "title", None)
    company_name = getattr(job_record, "company", None)
    job_description = getattr(job_record, "description", None)
    location = getattr(job_record, "location", None)

    # Create interview session with "enhancing" status
    interview_session_response = supabase_service.create_interview_session(
        user_id, 
        resume_record["id"], 
        request_data.job_description_id, 
        [],  # Empty question list initially
        request_data.type,  # Use the type from request instead of hardcoded
        status=RAGStatus.ENHANCING.value
    )

    
    if "error" in interview_session_response or not interview_session_response.data:
        raise HTTPException(status_code=500, detail="Failed to create interview session")
    
    interview_session = interview_session_response.data[0]
    session_id = interview_session["id"]
    
    logging.info(f"[Interview] Created interview session {session_id} for user {user_id}")
    logging.info(f"[Interview] Initiating RAG enhancement for interview {session_id} with these details: interview_type={request_data.type}, job_title={job_title}, company_name={company_name}, location={location}, job_description={job_description if job_description else 0}, resume_length={len(resume_text) if resume_text else 0}")

    # Request RAG enhancement (non-blocking)
    await rag_service.request_enhancement(
        interview_id=session_id,
        resume=resume_text,
        job_description=job_description,
        company=company_name,
        job_title=job_title
    )
    
    # Add background task to generate questions after RAG completes
    background_tasks.add_task(
        generate_questions_task,
        session_id,
        resume_text,
        job_title,
        job_description,
        company_name,
        location,
        request_data.type  # Use the actual type from request instead of hardcoded "technical"
    )
    
    # Return immediately - client will poll for status
    return {
        "session": interview_session,
        "message": "Interview session created. Questions are being generated with enhanced context."
    }

# get questions for a specific interview session
@router.get("/questions/{session_id}")
async def get_questions(session_id: str):
    """Get questions for a specific interview session."""
    questions_response = supabase_service.get_interview_question_table(session_id)
    if "error" in questions_response or not questions_response.data:
        raise HTTPException(status_code=404, detail="Questions not found")
    return questions_response.data  # Return data directly, not wrapped in {"questions": ...}

@router.get("/questions/enhanced/{session_id}")
async def get_enhanced_questions(session_id: str):
    """
    Get questions for an interview session, preferring RAG-enhanced versions if available.
    This endpoint checks if RAG enhancement has improved the questions and returns the best available version.
    """
    # Get the current questions
    questions_response = supabase_service.get_interview_question_table(session_id)
    if "error" in questions_response or not questions_response.data:
        raise HTTPException(status_code=404, detail="Questions not found")
    
    # Check RAG enhancement status
    rag_status = await rag_service.get_enhancement_status(session_id)
    
    return {
        "questions": questions_response.data,
        "enhanced": rag_status.get("enhanced_prompt_available", False),
        "rag_status": rag_status.get("status", "unknown"),
        "total_count": len(questions_response.data)
    }


def _get_status_message(status: str, reason: str = None) -> str:
    """Get user-friendly status message"""
    if status == "failed":
        if reason == "quota_exceeded":
            return "Service temporarily unavailable due to high demand."
        return "Question generation failed. Please try again later."

    messages = {
        "pending": "Interview preparation not started",
        "enhancing": "Enhancing your interview questions...",
        "processing": "Processing and generating questions...",
        "ready": "Your personalized interview is ready!",
        "completed": "Interview session completed",
        "failed": "Question generation failed. Please try again later.",
        "timeout": "Enhancement timed out, preparing standard questions...",
        "quota_exceeded": "Service temporarily unavailable due to high demand.",
        "cancelled": "Interview preparation was cancelled"
    }
    return messages.get(status, "Processing...")


@router.get("/status/{session_id}")
async def get_status(session_id: str):
    """
    Checks the status of the interview session from the database.
    This is the single source of truth for the frontend.
    """
    try:
        # Get interview session to check status
        interview_response = supabase_service.get_interview_session(session_id)
        
        if interview_response.data:
            interview = interview_response.data[0]
            db_status = interview.get("status")
            failure_reason = interview.get("failure_reason")
            
            # Use the helper to get a consistent message
            message = _get_status_message(db_status, failure_reason)
            
            return {
                "status": db_status,
                "message": message,
            }
        else:
            # This case should ideally not happen if session_id is valid
            raise HTTPException(status_code=404, detail="Interview session not found.")

    except Exception as e:
        logging.error(f"Error checking interview status for {session_id}: {e}")
        # Return a generic failure status if the database check fails
        return {
            "status": "failed",
            "message": "Could not retrieve interview status.",
        }


