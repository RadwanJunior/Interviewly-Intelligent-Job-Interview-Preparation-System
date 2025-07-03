from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, resume, interview, audio, dashboard, job_description
import os
import uvicorn

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL") or "http://localhost:3000"

# CORS setup (Adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include authentication routes from auth.py
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(resume.resume_router, prefix="/resumes" ,tags=["resumes"])
app.include_router(job_description.router, prefix="/job_description", tags=["job_description"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])
app.include_router(audio.router, prefix="/audio", tags=["audio"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)