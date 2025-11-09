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
