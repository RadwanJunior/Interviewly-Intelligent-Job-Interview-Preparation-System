from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, resume, interview, audio, dashboard, job_description, interview_call, conversation, live_feedback
import os
import uvicorn
import asyncio
from app.services.redis_service import initialize_redis, setup_rag_listeners

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
app.include_router(interview_call.router, prefix="/interview_call", tags=["interview_call"])
app.include_router(conversation.router, prefix="/conversation", tags=["conversation"])
app.include_router(live_feedback.router, prefix="/live_feedback", tags=["live_feedback"])

@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}

@app.get("/health/redis")
async def redis_health_check():
    """
    Health check endpoint for Redis listener.
    Returns detailed metrics for monitoring and alerting.
    """
    from app.services.redis_service import redis_client
    health_status = await redis_client.get_health_status()
    return health_status

@app.post("/admin/redis/reset-circuit-breaker")
async def reset_redis_circuit_breaker():
    """
    Administrative endpoint to manually reset the circuit breaker.
    Use this when you've fixed the underlying Redis issue.
    """
    from app.services.redis_service import redis_client
    success = await redis_client.reset_circuit_breaker()
    if success:
        return {"message": "Circuit breaker reset successfully", "success": True}
    else:
        return {"message": "Failed to reset circuit breaker", "success": False}

@app.on_event("startup")
async def startup_event():
    # Initialize Redis
    await initialize_redis()
    
    # Setup RAG listeners
    await setup_rag_listeners()

@app.on_event("shutdown")
async def shutdown_event():
    # Close Redis connections
    from app.services.redis_service import redis_client
    await redis_client.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)