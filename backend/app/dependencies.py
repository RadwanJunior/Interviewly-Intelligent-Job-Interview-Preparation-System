from fastapi import Depends, HTTPException, Request
from app.services.supabase_service import supabase_service

async def get_current_user(request: Request):
    """Extracts and verifies the user's access token from cookies."""
    access_token = request.cookies.get("access_token")
    
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get user details from Supabase
    user = supabase_service.get_user_from_token(access_token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user
