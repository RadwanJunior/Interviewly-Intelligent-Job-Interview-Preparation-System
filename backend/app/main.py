# FastAPI main application entry point
# Imports core FastAPI modules, middleware, and route modules
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse, JSONResponse
from pathlib import Path
import os

from app.routes import auth, resume, interview, audio, dashboard, job_description
import uvicorn


# Initialize FastAPI app
app = FastAPI()

# ---- CORS: support single or multiple frontend origins via env ----
# FRONTEND_URL="https://example.com"
# or FRONTEND_URLS="https://example.com,https://staging.example.com,http://localhost:3000"
_frontend_urls = []
if os.getenv("FRONTEND_URL"):
    _frontend_urls.append(os.getenv("FRONTEND_URL").strip())
if os.getenv("FRONTEND_URLS"):
    _frontend_urls += [u.strip() for u in os.getenv("FRONTEND_URLS").split(",") if u.strip()]

# Reasonable local defaults for dev if nothing provided
if not _frontend_urls:
    _frontend_urls = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Static & SPA fallback ----
# backend/static is where the Dockerfile copies the built frontend (/frontend/dist)
STATIC_DIR = (Path(__file__).resolve().parent.parent / "static").resolve()
INDEX_FILE = STATIC_DIR / "index.html"

if STATIC_DIR.exists():
    # Serve static assets (e.g., /static/assets/*)
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR), html=False), name="static")

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

@app.get("/", include_in_schema=False)
def read_root():
    if INDEX_FILE.exists():
        return FileResponse(str(INDEX_FILE))
    return JSONResponse({"message": "AI Mock Interview Backend is running!"})