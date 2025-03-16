from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from services.audio_to_text_service import transcribe_audio, get_transcription_result

router = APIRouter()

# A shared in-memory store or database could be used to save the results
results_store = {}

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    try:
        file_path = f"/tmp/{file.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        job_id = transcribe_audio(file_path)
        # Start background task to analyze transcript
        background_tasks.add_task(process_audio, job_id, file_path)
        return {"message": "Recording received. Processing in background.", "job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def process_audio(job_id: str, file_path: str):
    transcript = get_transcription_result(job_id)
    feedback = analyze_transcript(transcript)
    results_store[job_id] = {"transcript": transcript, "feedback": feedback} # should be saved to a database keep it in memory for now

@router.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id in results_store:
        return results_store[job_id]
    return {"message": "Processing, please check back shortly."}

def analyze_transcript(transcript: str):
    """Placeholder function for AI analysis of the transcript."""
    # Your AI analysis would go here.
    return {"analysis": "This is an analysis of the transcript."}