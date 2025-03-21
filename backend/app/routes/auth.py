from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel, EmailStr
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
        samesite="Lax"
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

@router.post("/logout")
async def logout(response: Response):
    """Clears session cookies and logs out the user."""
    supabase_service.logout()
    response.delete_cookie(ACCESS_TOKEN_COOKIE)
    response.delete_cookie(REFRESH_TOKEN_COOKIE)
    return {"message": "Logged out successfully"}
