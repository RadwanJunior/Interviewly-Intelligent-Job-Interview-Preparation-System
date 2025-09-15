import pytest
from app.services.supabase_service import SupabaseService

class MockSignUpResponse:
    def __init__(self, email):
        self.user = {"id": "123", "email": email}
        self.session = {"access_token": "test_token"}

class MockAuth:
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
    auth = MockAuth()

@pytest.fixture
def service():
    return SupabaseService(client=MockClient())

def test_create_user_success(service):
    result = service.create_user("test@gmail.com", "password123")
    assert result.user["email"] == "test@gmail.com"

def test_create_user_invalid_email(service):
    result = service.create_user("invalid-email", "password123")
    assert result == {"error": {"message": "Invalid email format"}}

def test_login_user_success(service):
    result = service.login_user("test@example.com", "password123")
    assert result["access_token"] == "token"
    assert result["user"]["email"] == "test@example.com"

def test_login_user_invalid(service):
    result = service.login_user("test@example.com", "wrongpassword")
    assert "error" in result