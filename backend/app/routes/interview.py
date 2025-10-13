from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from app.services.interview_service import InterviewService
from app.services.supabase_service import SupabaseService
from app.services.rag_service import RAGService, RAGStatus
import asyncio
import logging
from google.api_core import exceptions as google_exceptions

router = APIRouter()

# Global dictionary to simulate progress storage (in production, use persistent storage)
# PROGRESS_STORE = {}

class CreateInterviewRequest(BaseModel):
    job_description_id: str
    type: str

# async def simulate_progress(session_id: str):
#     progress = 0
#     while progress < 100:
#         await asyncio.sleep(1)
#         progress += 10
#         PROGRESS_STORE[session_id] = progress
#     # Mark as complete when done
#     PROGRESS_STORE[session_id] = 100

@router.post("/create")
async def create_interview_session(
    request_data: CreateInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
# Validate user authentication
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    resume_response = SupabaseService.get_resume_table(user_id)
    if "error" in resume_response or not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_record = resume_response.data[0]
    if not resume_record:
        raise HTTPException(status_code=403, detail="Invalid resume for this user")

    # Fetch the specific job description using its ID
    job_response = SupabaseService.get_job_description(request_data.job_description_id)
    if "error" in job_response or not job_response.data:
        raise HTTPException(status_code=404, detail="Job description not found")
    job_record = job_response.data

    if job_record.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Invalid job description for this user")

    # resume_text = resume_record.get("extracted_text", "")
    resume_text = getattr(resume_record, "extracted_text", None)
    # job_title = job_record.get("title", "")
    job_title = getattr(job_record, "title", None)
    # company_name = job_record.get("company", "")
    company_name = getattr(job_record, "id", None)
    # job_description = job_record.get("description", "")
    job_description = getattr(job_record, "description", None)
    # location = job_record.get("location", "")
    location = getattr(job_record, "location", None)

    # Generate questions (this is synchronous now; in a real app, this might also be asynchronous)
    questions_list = InterviewService.generate_questions(
        resume_text, job_title, job_description, company_name, location
    )
    if not questions_list:
        raise HTTPException(status_code=500, detail="Failed to generate interview questions")
    
    # Create the interview session record with an empty questions list initially
    interview_session_response = SupabaseService.create_interview_session(
        user_id, resume_record["id"], request_data.job_description_id, [], request_data.type
    )
    if "error" in interview_session_response or not interview_session_response.data:
        raise HTTPException(status_code=500, detail="Failed to create interview session")
    interview_session = interview_session_response.data[0]
    session_id = interview_session["id"]

    # Prepare questions insertion as before
    question_records = []
    count = 0
    for q in questions_list:
        question_text = q.get("question")
        count += 1
        if question_text:
            question_records.append({
                "interview_id": session_id,
                "question": question_text,
                "order": count
            })
    question_insert_response = SupabaseService.insert_interview_questions(question_records)
    if "error" in question_insert_response or not question_insert_response.data:
        raise HTTPException(status_code=500, detail="Failed to insert interview questions")
    question_ids = [record["id"] for record in question_insert_response.data]
    update_response = SupabaseService.update_interview_session_questions(session_id, question_ids)
    if "error" in update_response:
        raise HTTPException(status_code=500, detail="Failed to update interview session with questions")

    # Start background task to simulate progress updates
    # PROGRESS_STORE[session_id] = 0
    # background_tasks.add_task(simulate_progress, session_id)
    return {"session": interview_session, "question_ids": question_ids}

# get questions for a specific interview session
@router.get("/questions/{session_id}")
async def get_questions(session_id: str):
    questions_response = SupabaseService.get_interview_question_table(session_id)
    if "error" in questions_response or not questions_response.data:
        raise HTTPException(status_code=404, detail="Questions not found")
    return questions_response.data

# @router.get("/status/{session_id}")
# async def get_status(session_id: str):
#     prog = PROGRESS_STORE.get(session_id, 0)
#     return {"progress": prog, "completed": prog >= 100}

@router.post("/enhance/{interview_id}")
async def enhance_interview_prompt(interview_id: str, background_tasks: BackgroundTasks):
    """
    Trigger RAG enhancement for an existing interview.
    This creates a background task that will:
    1. Retrieve additional context using RAG
    2. Generate enhanced prompt
    3. Store the enhanced prompt for later use
    """
    try:
        # Validate interview exists
        interview_response = SupabaseService.get_interview_session(interview_id)
        if not interview_response or "error" in interview_response:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        # Start background RAG enhancement
        background_tasks.add_task(
            _background_rag_enhancement,
            interview_id
        )
        
        return {
            "message": "RAG enhancement initiated",
            "interview_id": interview_id,
            "status": "processing"
        }
        
    except Exception as e:
        logging.error(f"Error initiating RAG enhancement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate RAG enhancement")

async def _background_rag_enhancement(interview_id: str):
    """Background task to perform RAG enhancement"""
    try:
        logging.info(f"Starting RAG enhancement for interview {interview_id}")
        
        # Get interview details
        interview_response = SupabaseService.get_interview_session(interview_id)
        if not interview_response or "error" in interview_response:
            logging.error(f"Failed to retrieve interview session {interview_id}")
            return
            
        interview_data = interview_response.data[0] if interview_response.data else None
        if not interview_data:
            logging.error(f"No interview data found for {interview_id}")
            return
        
        # Update status to indicate processing
        SupabaseService.update_interview_status(interview_id, "rag_processing")
        
        # Perform RAG enhancement
        rag_service = RAGService()
        enhanced_prompt = await rag_service.enhance_prompt(
            resume_id=interview_data.get("resume_id"),
            job_description_id=interview_data.get("job_description_id"),
            interview_id=interview_id
        )
        
        if enhanced_prompt:
            # Store enhanced prompt and update status
            await SupabaseService.store_enhanced_prompt_and_update_status(
                interview_id, enhanced_prompt, "rag_ready"
            )
            logging.info(f"RAG enhancement completed for interview {interview_id}")
        else:
            # Update status to indicate failure
            SupabaseService.update_interview_status(interview_id, "rag_failed")
            logging.error(f"RAG enhancement failed for interview {interview_id}")
            
    except google_exceptions.ResourceExhausted as e:
        logging.error(f"Gemini quota exceeded for interview {interview_id}: {str(e)}")
        SupabaseService.update_interview_status(interview_id, "rag_quota_exceeded")
    except Exception as e:
        logging.error(f"Error during RAG enhancement for interview {interview_id}: {str(e)}")
        SupabaseService.update_interview_status(interview_id, "rag_failed")
