from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from app.services.interview_service import InterviewService
from app.services.supabase_service import SupabaseService
from app.services.rag_service import RAGService, RAGStatus
import asyncio
import logging

router = APIRouter()


class CreateInterviewRequest(BaseModel):
    job_description_id: str
    type: str


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
        rag_result = await RAGService.wait_for_enhancement(
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
        
        # Generate questions with or without enhanced prompt
        questions_list = InterviewService.generate_questions(
            resume_text, job_title, job_description, company_name, location,
            enhanced_prompt
        )
        
        if not questions_list:
            logging.error(f"[Interview] Failed to generate questions for interview {session_id}")
            await SupabaseService.update_interview_status(session_id, RAGStatus.FAILED.value)
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
            await SupabaseService.update_interview_status(session_id, RAGStatus.FAILED.value)
            return
        
        # Insert questions
        question_insert_response = SupabaseService.insert_interview_questions(question_records)
        if "error" in question_insert_response or not question_insert_response.data:
            logging.error(f"[Interview] Failed to insert questions: {question_insert_response}")
            await SupabaseService.update_interview_status(session_id, RAGStatus.FAILED.value)
            return
        
        question_ids = [record["id"] for record in question_insert_response.data]
        
        # Update interview session with questions and mark as ready
        update_response = SupabaseService.update_interview_session(
            session_id,
            {
                "question_ids": question_ids,
                "status": RAGStatus.READY.value
            }
        )
        
        if "error" in update_response:
            logging.error(f"[Interview] Failed to update interview session: {update_response}")
            await SupabaseService.update_interview_status(session_id, RAGStatus.FAILED.value)
            return
        
        logging.info(f"[Interview] Successfully generated {len(question_ids)} questions for interview {session_id}")
        
    except Exception as e:
        logging.error(f"[Interview] Error in question generation task: {str(e)}")
        await SupabaseService.update_interview_status(session_id, RAGStatus.FAILED.value)


@router.post("/create")
async def create_interview_session(
    request_data: CreateInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(SupabaseService.get_current_user)
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
    resume_response = SupabaseService.get_resume_table(user_id)
    if "error" in resume_response or not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_record = resume_response.data[0]
    
    job_response = SupabaseService.get_job_description(request_data.job_description_id)
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
    interview_session_response = SupabaseService.create_interview_session(
        user_id, 
        resume_record["id"], 
        request_data.job_description_id, 
        [],  # Empty question_ids initially
        request_data.type, 
        status=RAGStatus.ENHANCING.value
    )
    
    if "error" in interview_session_response or not interview_session_response.data:
        raise HTTPException(status_code=500, detail="Failed to create interview session")
    
    interview_session = interview_session_response.data[0]
    session_id = interview_session["id"]
    
    logging.info(f"[Interview] Created interview session {session_id} for user {user_id}")

    # Request RAG enhancement (non-blocking)
    await RAGService.request_enhancement(
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
        request_data.type
    )
    
    # Return immediately - client will poll for status
    return {
        "session": interview_session,
        "message": "Interview session created. Questions are being generated with enhanced context."
    }


@router.get("/questions/{session_id}")
async def get_questions(session_id: str):
    """Get questions for a specific interview session."""
    questions_response = SupabaseService.get_interview_question_table(session_id)
    if "error" in questions_response or not questions_response.data:
        raise HTTPException(status_code=404, detail="Questions not found")
    return questions_response.data


@router.get("/status/{interview_id}")
async def get_interview_status(
    interview_id: str,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    """
    Get the current status of an interview session.
    Used by frontend to poll for readiness.
    """
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    status_result = await RAGService.get_enhancement_status(interview_id)
    
    return {
        "interview_id": interview_id,
        "status": status_result.get("status"),
        "enhanced_prompt_available": status_result.get("enhanced_prompt_available", False),
        "message": _get_status_message(status_result.get("status"))
    }


def _get_status_message(status: str) -> str:
    """Get user-friendly status message"""
    messages = {
        RAGStatus.NOT_STARTED.value: "Interview preparation not started",
        RAGStatus.ENHANCING.value: "Enhancing your interview questions...",
        RAGStatus.VECTOR_SEARCH.value: "Searching our knowledge base...",
        RAGStatus.WEB_SCRAPING.value: "Gathering additional context from the web...",
        RAGStatus.PROCESSING.value: "Processing and generating questions...",
        RAGStatus.READY.value: "Interview is ready!",
        RAGStatus.FAILED.value: "Enhancement failed - using standard questions",
        RAGStatus.TIMEOUT.value: "Enhancement timed out - using standard questions"
    }
    return messages.get(status, "Processing...")