from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from backend.app.services.feedback_service import FeedbackService
from backend.app.services.supabase_service import SupabaseService

router = APIRouter()

# A shared in-memory store or database could be used to save the results
results_store = {}

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    try:
        # Start background task to analyze transcript
       
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id in results_store:
        return results_store[job_id]
    return {"message": "Processing, please check back shortly."}
