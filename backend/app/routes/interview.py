from fastapi import APIRouter, Depends, HTTPException, Body, Request
from pydantic import BaseModel
from app.services.interview_service import InterviewService
from app.services.supabase_service import SupabaseService

router = APIRouter()

class CreateInterviewRequest(BaseModel):
    resume_id: str
    job_description_id: str

@router.post("/create")
async def create_interview_session(
    request_data: CreateInterviewRequest,
    request: Request,
    current_user: dict = Depends(SupabaseService.get_current_user)
):
    # Validate user authentication
    if not current_user or not current_user.get("id"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = current_user["id"]

    # Validate that the resume belongs to the user
    resume_response = SupabaseService.get_resume_table(user_id)
    if "error" in resume_response or not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    # Find the resume by ID
    resume_record = next((r for r in resume_response.data if r["id"] == request_data.resume_id), None)
    if not resume_record:
        raise HTTPException(status_code=403, detail="Invalid resume for this user")

    # Fetch the specific job description using its ID
    job_response = SupabaseService.get_job_description(request_data.job_description_id)
    if "error" in job_response or not job_response.data:
        raise HTTPException(status_code=404, detail="Job description not found")
    job_record = job_response.data
    
    # Validate that the job description belongs to the current user
    if job_record.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Invalid job description for this user")

    # Retrieve necessary data
    resume_text = resume_record.get("extracted_text", "")
    job_title = job_record.get("title", "")
    company_name = job_record.get("company", "")
    job_description = job_record.get("description", "")
    location = job_record.get("location", "")

    # Generate interview questions via LLM (using InterviewService)
    questions_list = InterviewService.generate_questions(
        resume_text, job_title, job_description, company_name, location
    )
    if not questions_list:
        raise HTTPException(status_code=500, detail="Failed to generate interview questions")

    # Create the interview session record with an empty questions list initially
    interview_session_response = SupabaseService.create_interview_session(
        user_id, request_data.resume_id, request_data.job_description_id, []
    )
    if "error" in interview_session_response or not interview_session_response.data:
        raise HTTPException(status_code=500, detail="Failed to create interview session")
    interview_session = interview_session_response.data[0]
    interview_session_id = interview_session["id"]

    # Prepare the list of question records to insert in batch
    question_records = []
    for q in questions_list:
        question_text = q.get("question")
        if question_text:
            question_records.append({
                "interview_id": interview_session_id,
                "question": question_text
            })

    # Batch insert all interview questions using SupabaseService
    question_insert_response = SupabaseService.insert_interview_questions(question_records)
    if "error" in question_insert_response or not question_insert_response.data:
        raise HTTPException(status_code=500, detail="Failed to insert interview questions")
    
    # Extract the list of inserted question IDs
    question_ids = [record["id"] for record in question_insert_response.data]

    # Update the interview session with the list of question IDs in one write
    update_response = SupabaseService.update_interview_session_questions(interview_session_id, question_ids)
    if "error" in update_response:
        raise HTTPException(status_code=500, detail="Failed to update interview session with questions")

    return {"session": interview_session, "question_ids": question_ids}
