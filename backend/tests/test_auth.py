<<<<<<< HEAD
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
=======
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace

from app.main import app


class DummySession(SimpleNamespace):
    """Mimics Supabase session objects while supporting 'error' membership checks."""

    def __contains__(self, item):
        return False


@pytest.fixture
def client():
    return TestClient(app)


def _signup_payload(email="user@example.com"):
    return {
        "firstName": "Test",
        "lastName": "User",
        "email": email,
        "password": "StrongPassword123",
    }


def test_signup_success(monkeypatch, client):
    session = DummySession(user=SimpleNamespace(id="u-1"))

    calls = {}

    def fake_create_user(email, password):
        calls["create_user"] = (email, password)
        return session

    def fake_create_profile(profile):
        calls["create_profile"] = profile
        return {"id": profile["id"]}

    monkeypatch.setattr("app.routes.auth.supabase_service.create_user", fake_create_user)
    monkeypatch.setattr("app.routes.auth.supabase_service.create_profile", fake_create_profile)

    resp = client.post("/auth/signup", json=_signup_payload())

    assert resp.status_code == 200
    assert "Account created" in resp.json()["message"]
    assert calls["create_user"][0] == "user@example.com"
    assert calls["create_profile"]["id"] == "u-1"


def test_signup_supabase_error(monkeypatch, client):
    monkeypatch.setattr(
        "app.routes.auth.supabase_service.create_user",
        lambda email, password: {"error": {"message": "duplicate"}},
    )

    resp = client.post("/auth/signup", json=_signup_payload())

    assert resp.status_code == 400
    assert resp.json()["detail"] == "duplicate"


def test_signup_missing_user(monkeypatch, client):
    monkeypatch.setattr(
        "app.routes.auth.supabase_service.create_user",
        lambda email, password: DummySession(user=None),
    )

    resp = client.post("/auth/signup", json=_signup_payload())

    assert resp.status_code == 400
    assert resp.json()["detail"] == "User creation failed"


def test_signup_profile_error(monkeypatch, client):
    session = DummySession(user=SimpleNamespace(id="u-1"))

    monkeypatch.setattr("app.routes.auth.supabase_service.create_user", lambda e, p: session)
    monkeypatch.setattr(
        "app.routes.auth.supabase_service.create_profile",
        lambda profile: {"error": {"message": "db down"}},
    )

    resp = client.post("/auth/signup", json=_signup_payload())

    assert resp.status_code == 400
    assert resp.json()["detail"] == "db down"


def test_login_success(monkeypatch, client):
    def fake_login(email, password):
        return {
            "access_token": "a",
            "refresh_token": "r",
            "user": {"id": "u"},
        }

    monkeypatch.setattr("app.routes.auth.supabase_service.login_user", fake_login)

    resp = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "pass"},
    )

    assert resp.status_code == 200
    assert resp.cookies.get("access_token") == "a"
    assert resp.cookies.get("refresh_token") == "r"
    assert resp.json()["user"]["id"] == "u"


def test_login_error(monkeypatch, client):
    monkeypatch.setattr(
        "app.routes.auth.supabase_service.login_user",
        lambda e, p: {"error": {"message": "invalid"}},
    )

    resp = client.post(
        "/auth/login",
        json={"email": "user@example.com", "password": "pass"},
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "invalid"


def test_refresh_success(monkeypatch, client):
    def fake_refresh(token):
        assert token == "refresh"
        return {"access_token": "new", "user": {"id": "u"}}

    monkeypatch.setattr("app.routes.auth.supabase_service.refresh_token", fake_refresh)

    resp = client.post("/auth/refresh", cookies={"refresh_token": "refresh"})

    assert resp.status_code == 200
    assert resp.cookies.get("access_token") == "new"


def test_refresh_no_cookie(client):
    resp = client.post("/auth/refresh")

    assert resp.status_code == 401
    assert resp.json()["detail"] == "No refresh token found"


def test_refresh_error(monkeypatch, client):
    monkeypatch.setattr(
        "app.routes.auth.supabase_service.refresh_token",
        lambda token: {"error": {"message": "expired"}},
    )

    resp = client.post("/auth/refresh", cookies={"refresh_token": "refresh"})

    assert resp.status_code == 401
    assert resp.json()["detail"] == "expired"


def test_logout_clears_cookies(monkeypatch, client):
    called = {}

    def fake_logout():
        called["logout"] = True

    monkeypatch.setattr("app.routes.auth.supabase_service.logout", fake_logout)

    resp = client.post("/auth/logout")

    assert resp.status_code == 200
    assert called["logout"]
    assert resp.cookies.get("access_token") is None
>>>>>>> 32d61ad6b592fe1179f83f19d2a6fba1c6b58eae
