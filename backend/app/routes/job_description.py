from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from app.services.job_description_service import process_job_description, JobDescription

router = APIRouter(prefix="/api/job-description", tags=["job-description"])

@router.post("/upload", response_model=JobDescription)
async def upload_job_description(file: UploadFile = File(...)):
    try:
        if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        result = await process_job_description(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{job_id}")
async def update_job_description(job_id: str, content: str):
    # TODO: Implement update functionality
    return JSONResponse(content={"message": "Job description updated", "job_id": job_id})
