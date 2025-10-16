# FastAPI main application entry point
# Imports core FastAPI modules, middleware, and route modules
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, resume, interview, audio, dashboard, job_description, interview_call, conversation, live_feedback
import os
import uvicorn
from app.services.redis_service import initialize_redis, setup_rag_listeners, redis_client
from contextlib import asynccontextmanager
import logging

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
app = FastAPI(
    title="Interviewly API",
    version="1.0.0",
    lifespan=lifespan  # Now lifespan is defined above
)

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
app.include_router(interview_call.router, prefix="/interview_call", tags=["interview_call"])
app.include_router(conversation.router, prefix="/conversation", tags=["conversation"])
app.include_router(live_feedback.router, prefix="/live_feedback", tags=["live_feedback"])

# Health check endpoint. When running lets user know that backend is operational
@app.get("/")
def read_root():
    return {"message": "AI Mock Interview Backend is running!"}

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

# Run the app with Uvicorn if executed directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)