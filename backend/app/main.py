# FastAPI main application entry point
# Imports core FastAPI modules, middleware, and route modules
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, resume, interview, audio, dashboard, job_description
import os
import uvicorn


# Initialize FastAPI app
app = FastAPI()


# Get frontend URL from environment or use default for local development
FRONTEND_URL = os.getenv("FRONTEND_URL") or "http://localhost:3000"


# CORS middleware configuration
# Allows frontend to communicate with backend (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Register API route modules
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(resume.resume_router, prefix="/resumes" ,tags=["resumes"])
app.include_router(job_description.router, prefix="/job_description", tags=["job_description"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])
app.include_router(audio.router, prefix="/audio", tags=["audio"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])


# Health check endpoint. When running lets user know that backend is operational
@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}


# Run the app with Uvicorn if executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)