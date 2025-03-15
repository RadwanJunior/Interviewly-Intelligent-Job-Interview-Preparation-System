# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import resume_router  # Import only the resume router

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include only the resume router
app.include_router(resume_router, prefix="/resume", tags=["resume"])

@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}

