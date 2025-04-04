from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel, EmailStr
import os
from app.services.supabase_service import supabase_service
import datetime

router = APIRouter()

# Cookie keys
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

# Determine cookie security based on environment
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "").lower() == "production"
COOKIE_SECURE = IS_PRODUCTION  # True in production, False in development
COOKIE_DOMAIN = "interviewly.onrender.com"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days in seconds

# Define cookie setting function to avoid repeating code
def set_auth_cookie(response: Response, name: str, value: str):
    response.set_cookie(
        key=name,
        value=value,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Lax",
        max_age=COOKIE_MAX_AGE,
        expires=datetime.datetime.utcnow() + datetime.timedelta(seconds=COOKIE_MAX_AGE),
        path="/",
        domain=COOKIE_DOMAIN if IS_PRODUCTION else None
    )

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
    set_auth_cookie(response, ACCESS_TOKEN_COOKIE, session["access_token"])
    set_auth_cookie(response, REFRESH_TOKEN_COOKIE, session["refresh_token"])

    print("session: ", session)

    return {"message": "Login successful", "user": session["user"]}

@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refreshes the access token using the refresh token stored in cookies."""
    print("Request Exists")
    print(request)
    print("Request Does Not Exists")
    print("Cookie exists")
    print(request.cookies)
    print("Cookie does not exists")

    refresh_token_value = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not refresh_token_value:
        raise HTTPException(status_code=401, detail="No refresh token found")

    new_session = supabase_service.refresh_token(refresh_token_value)
    if "error" in new_session:
        raise HTTPException(status_code=401, detail=new_session["error"]["message"])

    # Update access token in cookies
    set_auth_cookie(response, ACCESS_TOKEN_COOKIE, new_session["access_token"])

    return {"message": "Token refreshed", "user": new_session["user"]}

@router.post("/logout")
async def logout(response: Response):
    """Clears session cookies and logs out the user."""
    supabase_service.logout()
    response.delete_cookie(ACCESS_TOKEN_COOKIE)
    response.delete_cookie(REFRESH_TOKEN_COOKIE)
    return {"message": "Logged out successfully"}

@router.get("/debug-cookies")
async def debug_cookies(request: Request):
    """Debug endpoint to check what cookies are being received."""
    cookies = request.cookies
    return {"cookies": cookies}
