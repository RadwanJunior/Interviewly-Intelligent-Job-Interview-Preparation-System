from pathlib import Path
import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import APIRouter, FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.routes import (
    auth,
    resume,
    interview,
    audio,
    dashboard,
    job_description,
    interview_call,
    conversation,
    live_feedback,
)
from app.services.redis_service import (
    initialize_redis,
    setup_rag_listeners,
    redis_client,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app startup and shutdown"""
    # Startup
    logging.info("Starting up application...")
    
    # Initialize Redis
    await initialize_redis()
    
    # Setup RAG listeners
    await setup_rag_listeners()
    
    yield
    
    # Shutdown
    logging.info("Shutting down application...")
    
    # Close Redis connections and stop listener
    try:
        await redis_client.close()
        logging.info("Redis service closed successfully")
    except Exception as e:
        logging.error(f"Error closing Redis service: {e}")
    
    logging.info("Application shutdown complete")

# Initialize FastAPI app
app = FastAPI(title="Interviewly API", version="1.0.0", lifespan=lifespan)

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

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(resume.resume_router, prefix="/resumes", tags=["resumes"])
api_router.include_router(job_description.router, prefix="/job_description", tags=["job_description"])
api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
api_router.include_router(audio.router, prefix="/audio", tags=["audio"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(interview_call.router, prefix="/interview_call", tags=["interview_call"])
api_router.include_router(conversation.router, prefix="/conversation", tags=["conversation"])
api_router.include_router(live_feedback.router, prefix="/live_feedback", tags=["live_feedback"])

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/health/redis")
async def redis_health_check():
    """
    Health check endpoint for Redis listener.
    Returns detailed metrics for monitoring and alerting.
    """
    health_status = await redis_client.get_health_status()
    return health_status

@app.post("/admin/redis/reset-circuit-breaker")
async def reset_redis_circuit_breaker():
    """
    Administrative endpoint to manually reset the circuit breaker.
    Use this when you've fixed the underlying Redis issue.
    """
    success = await redis_client.reset_circuit_breaker()
    if success:
        return {"message": "Circuit breaker reset successfully", "success": True}
    else:
        return {"message": "Failed to reset circuit breaker", "success": False}

# Serve static frontend if bundled (Next.js export) with SPA-style fallback
frontend_dir = Path(__file__).resolve().parent.parent / "frontend-static"
index_file = frontend_dir / "index.html"


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if not frontend_dir.exists() or not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend assets not found")

    # Reject absolute, traversal, empty, or hidden file paths
    req_path = Path(full_path)
    
    # Disallow absolute paths, parent traversal, empty, or hidden file paths
    if req_path.is_absolute() or any(part in ("..", "") for part in req_path.parts) or any(part.startswith('.') for part in req_path.parts):
        raise HTTPException(status_code=404, detail="Invalid file path")

    # Always resolve root directory once for all containment checks
    frontend_root = frontend_dir.resolve()
    # Safely resolve target file
    target_file = (frontend_root / req_path).resolve()
    # Ensure the requested path is within the frontend static directory
    try:
        target_file.relative_to(frontend_root)
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

    if target_file.is_file():
        return FileResponse(target_file)

    # When serving a nested index, reconstruct the path starting from the safe root
    nested_index = (frontend_root / req_path / "index.html").resolve()
    # Ensure the nested index path is also within frontend static directory
    try:
        nested_index.relative_to(frontend_root)
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")
    if nested_index.is_file():
        return FileResponse(nested_index)

    return FileResponse(index_file)

# Run the app with Uvicorn if executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
