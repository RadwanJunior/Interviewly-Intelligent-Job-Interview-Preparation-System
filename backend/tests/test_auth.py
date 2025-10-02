# =============================
# test_auth.py - Integration tests for authentication API endpoints
# Tests signup and login flows using the FastAPI test client fixture.
# =============================

import uuid
def test_signup_success(client):
    """
    Test that a user can successfully sign up with valid credentials.
    """
    payload = {
        "firstName": "Test",
        "lastName": "User",
        "email": f"testuser_{uuid.uuid4().hex[:8]}@gmail.com",
        "password": "StrongPassword123"
    }
    print("Signup Payload:", payload)
    response = client.post("/auth/signup", json=payload)
    assert response.status_code in [200, 201], response.text
    assert "message" in response.json()

def test_signup_invalid_email(client):
    """
    Test that signup fails with an invalid email address.
    """
    payload = {
        "firstName": "Test",
        "lastName": "User",
        "email": "not-an-email",
        "password": "StrongPassword123"
    }
    response = client.post("/auth/signup", json=payload)
    assert response.status_code in [400, 422], response.text

def test_login_success(client):
    """
    Test that a user can log in after signing up with valid credentials.
    """
    email = f"testuser_{uuid.uuid4().hex[:8]}@gmail.com"
    password = "StrongPassword123"
    signup_payload = {
        "firstName": "Test",
        "lastName": "User",
        "email": email,
        "password": password
    }
    client.post("/auth/signup", json=signup_payload)
    login_payload = {
        "email": email,
        "password": password
    }
    response = client.post("/auth/login", json=login_payload)
    assert response.status_code in [200, 201], response.text
    assert "message" in response.json()

def test_login_invalid_credentials(client):
    """
    Test that login fails with invalid credentials.
    """
    payload = {
        "email": "testuser@gmail.com",
        "password": "WrongPassword"
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 400 or response.status_code == 401