from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from app.services.interview_service import InterviewService
from app.services.supabase_service import SupabaseService
from app.services.rag_service import RAGService
import asyncio

router = APIRouter()


class CreateInterviewRequest(BaseModel):
    job_description_id: str
    type: str

@router.post("/create")
async def create_interview_session(
    request_data: CreateInterviewRequest,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    # Validation code stays the same
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    # Fetch resume and job data - no changes here
    resume_response = SupabaseService.get_resume_table(user_id)
    if "error" in resume_response or not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_record = resume_response.data[0]
    
    job_response = SupabaseService.get_job_description(request_data.job_description_id)
    if "error" in job_response or not job_response.data:
        raise HTTPException(status_code=404, detail="Job description not found")
    job_record = job_response.data

    # Extract data - fixed the company_name to use "company" instead of "id"
    resume_text = getattr(resume_record, "extracted_text", None)
    job_title = getattr(job_record, "title", None)
    company_name = getattr(job_record, "company", None)  # Fixed: Using company not id
    job_description = getattr(job_record, "description", None)
    location = getattr(job_record, "location", None)

    # 1. First create the interview session with "enhancing" status
    interview_session_response = SupabaseService.create_interview_session(
        user_id, resume_record["id"], request_data.job_description_id, [], 
        request_data.type, status="enhancing"
    )
    
    if "error" in interview_session_response or not interview_session_response.data:
        raise HTTPException(status_code=500, detail="Failed to create interview session")
    
    interview_session = interview_session_response.data[0]
    session_id = interview_session["id"]

    # 2. Run RAG synchronously - WAIT for it to complete
    rag_result = await RAGService.initiate_interview(
        interview_id=session_id,
        resume=resume_text,
        job_description=job_description,
        company=company_name,
        job_title=job_title
    )
    
    # 3. Generate questions using the enhanced context from RAG
    enhanced_prompt = SupabaseService.get_enhanced_prompt(session_id)
    
    questions_list = InterviewService.generate_questions(
        resume_text, job_title, job_description, company_name, location,
        enhanced_prompt  # Pass the enhanced prompt here
    )
    
    if not questions_list:
        # Fall back to basic questions if RAG enhancement failed
        questions_list = InterviewService.generate_questions(
            resume_text, job_title, job_description, company_name, location
        )
        if not questions_list:
            raise HTTPException(status_code=500, detail="Failed to generate interview questions")
    
    # 4. Store the questions
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
    
    # 5. Update interview session with questions and status="ready"
    update_response = SupabaseService.update_interview_session(
        session_id,
        {
            "question_ids": question_ids,
            "status": "ready"
        }
    )
    
    if "error" in update_response:
        raise HTTPException(status_code=500, detail="Failed to update interview session with questions")
    
    # Return the completed interview session
    return {
        "session": {**interview_session, "status": "ready"}, 
        "question_ids": question_ids
    }

# get questions for a specific interview session
@router.get("/questions/{session_id}")
async def get_questions(session_id: str):
    questions_response = SupabaseService.get_interview_question_table(session_id)
    if "error" in questions_response or not questions_response.data:
        raise HTTPException(status_code=404, detail="Questions not found")
    return questions_response.data

@router.get("/status/{interview_id}")
async def get_interview_status(interview_id: str):
    """Get the current status of an interview session."""
    status = SupabaseService.get_interview_status(interview_id)
    
    # Also check if enhanced prompt exists
    enhanced_prompt = SupabaseService.get_enhanced_prompt(interview_id)
    
    return {
        "status": status,
        "enhanced_prompt_available": enhanced_prompt is not None
    }