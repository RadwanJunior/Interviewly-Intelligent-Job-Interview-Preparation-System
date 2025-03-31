from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, resume, interview
from app.routes import job_description

app = FastAPI()

# CORS setup (Adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include authentication routes from auth.py
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(resume.resume_router, prefix="/resumes" ,tags=["resumes"])
app.include_router(job_description.router, prefix="/job_description", tags=["job_description"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])

@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}
