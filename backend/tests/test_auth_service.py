# =============================
# test_auth_service.py - Unit tests for SupabaseService authentication methods
# Uses mock classes to simulate Supabase client behavior for signup and login.
# =============================

import pytest
from app.services.supabase_service import SupabaseService

class MockSignUpResponse:
    """Mock response object for simulating a successful signup."""
    def __init__(self, email):
        self.user = {"id": "123", "email": email}
        self.session = {"access_token": "test_token"}

class MockAuth:
    """Mock authentication class to simulate Supabase auth methods."""
    def sign_up(self, data):
        if data["email"] == "invalid-email":
            raise Exception("Invalid email format")
        return MockSignUpResponse(data["email"])

    def sign_in_with_password(self, data):
        if data["password"] == "wrongpassword":
            return None
        class Session:
            access_token = "token"
            refresh_token = "refresh"
        return type("obj", (), {"session": Session(), "user": {"id": "123", "email": data["email"]}})()

class MockClient:
    """Mock Supabase client with a mock auth property."""
    auth = MockAuth()

@pytest.fixture
def service():
    """
    Pytest fixture that provides a SupabaseService instance using a mock client.
    """
    return SupabaseService(client=MockClient())

def test_create_user_success(service):
    """
    Test that create_user returns a user object for valid credentials.
    """
    result = service.create_user("test@gmail.com", "password123")
    assert result.user["email"] == "test@gmail.com"

def test_create_user_invalid_email(service):
    """
    Test that create_user returns an error dict for invalid email format.
    """
    result = service.create_user("invalid-email", "password123")
    assert result == {"error": {"message": "Invalid email format"}}

def test_login_user_success(service):
    """
    Test that login_user returns access token and user info for valid credentials.
    """
    result = service.login_user("test@example.com", "password123")
    assert result["access_token"] == "token"
    assert result["user"]["email"] == "test@example.com"

def test_login_user_invalid(service):
    """
    Test that login_user returns an error dict for invalid credentials.
    """
    result = service.login_user("test@example.com", "wrongpassword")
    assert "error" in result