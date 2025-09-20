from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from app.services.interview_service import InterviewService
from app.services.supabase_service import supabase_service
import asyncio

router = APIRouter()
interview_service = InterviewService()
# Global dictionary to simulate progress storage (in production, use persistent storage)
PROGRESS_STORE = {}

class CreateInterviewRequest(BaseModel):
        job_description_id: str

async def simulate_progress(session_id: str):
    progress = 0
    while progress < 100:
        await asyncio.sleep(1)
        progress += 10
        PROGRESS_STORE[session_id] = progress
    # Mark as complete when done
    PROGRESS_STORE[session_id] = 100

@router.post("/create")
async def create_interview_session(
    request_data: CreateInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(supabase_service.get_current_user)
):
# Validate user authentication
    if not current_user or not getattr(current_user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user.id

    resume_response = supabase_service.get_resume_table(user_id)
    if "error" in resume_response or not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_record = resume_response.data[0]
    if not resume_record:
        raise HTTPException(status_code=403, detail="Invalid resume for this user")

    # Fetch the specific job description using its ID
    job_response = supabase_service.get_job_description(request_data.job_description_id)
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
    interview_session_response = supabase_service.create_interview_session(
        user_id, resume_record["id"], request_data.job_description_id, []
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
    question_insert_response = supabase_service.insert_interview_questions(question_records)
    if "error" in question_insert_response or not question_insert_response.data:
        raise HTTPException(status_code=500, detail="Failed to insert interview questions")
    question_ids = [record["id"] for record in question_insert_response.data]
    update_response = supabase_service.update_interview_session_questions(session_id, question_ids)
    if "error" in update_response:
        raise HTTPException(status_code=500, detail="Failed to update interview session with questions")

    # Start background task to simulate progress updates
    PROGRESS_STORE[session_id] = 0
    background_tasks.add_task(simulate_progress, session_id)
    return {"session": interview_session, "question_ids": question_ids}

# get questions for a specific interview session
@router.get("/questions/{session_id}")
async def get_questions(session_id: str):
    questions_response = supabase_service.get_interview_question_table(session_id)
    if "error" in questions_response or not questions_response.data:
        raise HTTPException(status_code=404, detail="Questions not found")
    return questions_response.data

@router.get("/status/{session_id}")
async def get_status(session_id: str):
    prog = PROGRESS_STORE.get(session_id, 0)
    return {"progress": prog, "completed": prog >= 100}
