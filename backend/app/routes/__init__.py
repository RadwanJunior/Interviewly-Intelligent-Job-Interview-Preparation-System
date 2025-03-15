# app/routes/__init__.py
from fastapi import APIRouter
from .resume import router as resume_router
from .auth import router as auth_router
# Add other routers here if necessary

router = APIRouter()

# Include only the routers you want in the unified router
router.include_router(resume_router, prefix="/resume", tags=["resume"])
router.include_router(auth_router, prefix="/auth", tags=["auth"])
