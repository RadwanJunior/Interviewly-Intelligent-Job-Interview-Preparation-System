from fastapi import APIRouter
from .auth import router as auth_router
from .resume import router as resume_router  # Import resume routes

router = APIRouter()

# Include authentication routes
router.include_router(auth_router, prefix="/auth", tags=["auth"])

# Include resume parsing routes
router.include_router(resume_router, prefix="/resume", tags=["resume"])