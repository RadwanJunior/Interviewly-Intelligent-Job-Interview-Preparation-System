from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from app.services.supabase_service import supabase_service

router = APIRouter()

# Cookie keys
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

# Determine cookie security based on environment.
# In development (localhost), secure should be False.
IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"
COOKIE_SECURE = True if IS_PRODUCTION else False

# Define Pydantic models for the request body
class AuthPayload(BaseModel):
    email: EmailStr
    password: str

class SignupPayload(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str

@router.post("/signup")
async def signup(payload: SignupPayload, response: Response):
    """Handles user signup and creates a profile."""
    session = supabase_service.create_user(payload.email, payload.password)
    if "error" in session:
        raise HTTPException(status_code=400, detail=session["error"]["message"])

    user = session.user
    if not user:
        raise HTTPException(status_code=400, detail="User creation failed")

    profile = {
        "id": user.id,
        "first_name": payload.firstName,
        "last_name": payload.lastName,
        "email": payload.email,
    }

    profile_result = supabase_service.create_profile(profile)
    if "error" in profile_result:
        raise HTTPException(status_code=400, detail=profile_result["error"]["message"])

    # Do not set cookies here since the email is not confirmed yet.
    return {"message": "Account created successfully. Please check your email to confirm your account."}

@router.post("/login")
async def login(response: Response, payload: AuthPayload):
    """Logs in a user and sets access & refresh tokens as cookies."""
    session = supabase_service.login_user(payload.email, payload.password)
    if "error" in session:
        raise HTTPException(status_code=400, detail=session["error"]["message"])

    # Set HTTP-only cookies
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=session["access_token"],
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Lax"
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=session["refresh_token"],
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="None"
    )

    print("session: ", session)

    return {"message": "Login successful", "user": session["user"]}

@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refreshes the access token using the refresh token stored in cookies."""
    refresh_token_value = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not refresh_token_value:
        raise HTTPException(status_code=401, detail="No refresh token found")

    new_session = supabase_service.refresh_token(refresh_token_value)
    if "error" in new_session:
        raise HTTPException(status_code=401, detail=new_session["error"]["message"])

    # Update access token in cookies
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=new_session["access_token"],
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Lax"
    )

    return {"message": "Token refreshed", "user": new_session["user"]}

# Reuse existing Pydantic models or define minimal ones for profile update:
class ProfileUpdatePayload(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

@router.get("/profile")
async def get_profile(request: Request):
    """
    Return the profiles row for the currently-authenticated user.
    Auth is determined via access_token cookie (access_token set at /login).
    """
    access_token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # supabase_service should expose a method to fetch the user/session from token.
    # Example helper names: get_user_from_access_token, get_session_from_token, etc.
    # If you don't have one, implement it in supabase_service using the supabase admin client:
    # supabase.auth.api.get_user(access_token) or verify session token accordingly.
    try:
        user = supabase_service.get_user_from_access_token(access_token)
        user_id = user.user.id
    except Exception as e:
        print("Error fetching user:", e)
        raise


    # Fetch profile row by user.id
    profile = supabase_service.get_profile(user_id)
    if profile is None:
        # no profile found (unlikely if you create profile on signup)
        raise HTTPException(status_code=404, detail="Profile not found")

    # Return only fields the client needs
    return {
        "id": profile.get("id"),
        "username": profile.get("username"),
        "first_name": profile.get("first_name"),
        "last_name": profile.get("last_name"),
        "email": profile.get("email"),
        "created_at": profile.get("created_at"),
        "updated_at": profile.get("updated_at"),
    }

@router.patch("/profile")
async def patch_profile(request: Request, payload: ProfileUpdatePayload):
    """
    Update first_name and/or last_name for the current user.
    """
    access_token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    print("Access token:", access_token)
    try:
        user = supabase_service.get_user_from_access_token(access_token)
        user_id = user.user.id
        print("User fetched:", user_id)
    except Exception as e:
        print("Error fetching user:", e)
        raise


    update_data = {}
    if payload.first_name is not None:
        update_data["first_name"] = payload.first_name
    if payload.last_name is not None:
        update_data["last_name"] = payload.last_name

    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    updated = supabase_service.update_profile_by_id(user.id, update_data)
    if "error" in (updated or {}):
        raise HTTPException(status_code=500, detail=updated["error"]["message"])

    return {
        "id": updated.get("id"),
        "first_name": updated.get("first_name"),
        "last_name": updated.get("last_name"),
        "email": updated.get("email"),
        "created_at": updated.get("created_at"),
        "updated_at": updated.get("updated_at"),
    }

@router.put("/profile")
async def edit_profile(updates: dict, current_user: dict = Depends(supabase_service.get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    updated_profile = supabase_service.update_profile(current_user.id, updates)
    return updated_profile

@router.post("/logout")
async def logout(response: Response):
    """Clears session cookies and logs out the user."""
    supabase_service.logout()
    response.delete_cookie(ACCESS_TOKEN_COOKIE)
    response.delete_cookie(REFRESH_TOKEN_COOKIE)
    return {"message": "Logged out successfully"}
