import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.services.supabase_service import supabase_service as real_supabase_service


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def workflow_mocks():
    from app.routes import resume

    original_workflow = resume.workflow_service
    mock_workflow = MagicMock()
    mock_workflow.upload_resume = AsyncMock()
    resume.workflow_service = mock_workflow
    try:
        yield mock_workflow
    finally:
        resume.workflow_service = original_workflow


@pytest.fixture
def set_current_user():
    def _set(user):
        def dependency(request=None):
            return user
        app.dependency_overrides[real_supabase_service.get_current_user] = dependency

    yield _set
    app.dependency_overrides.pop(real_supabase_service.get_current_user, None)


def test_upload_resume_success(client, workflow_mocks, set_current_user):
    set_current_user(SimpleNamespace(id="user-123"))
    workflow_mocks.upload_resume.return_value = {"status": "ok"}

    files = {"file": ("resume.pdf", b"content", "application/pdf")}
    resp = client.post("/resumes/upload", files=files)

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
    workflow_mocks.upload_resume.assert_awaited_once()


def test_upload_resume_unauthorized(client, workflow_mocks, set_current_user):
    set_current_user(None)

    files = {"file": ("resume.pdf", b"content", "application/pdf")}
    resp = client.post("/resumes/upload", files=files)

    assert resp.status_code == 200
    assert resp.json() == {"error": "Unauthorized or invalid user"}
    workflow_mocks.upload_resume.assert_not_called()


def test_update_resume_success(client, workflow_mocks, set_current_user):
    set_current_user(SimpleNamespace(id="user-123"))
    workflow_mocks.update_extracted_text.return_value = {"updated": True}

    resp = client.put("/resumes/", json={"updated_text": "New text"})

    assert resp.status_code == 200
    assert resp.json() == {"updated": True}
    workflow_mocks.update_extracted_text.assert_called_once_with("user-123", "New text")


def test_update_resume_unauthorized(client, workflow_mocks, set_current_user):
    set_current_user(SimpleNamespace(id=None))

    resp = client.put("/resumes/", json={"updated_text": "New text"})

    assert resp.status_code == 200
    assert resp.json() == {"error": "Unauthorized or invalid user"}
    workflow_mocks.update_extracted_text.assert_not_called()


def test_get_resume_success(client, workflow_mocks, set_current_user):
    set_current_user(SimpleNamespace(id="user-123"))
    workflow_mocks.get_resume_text.return_value = {"text": "Resume text"}

    resp = client.get("/resumes/")

    assert resp.status_code == 200
    assert resp.json() == {"text": "Resume text"}
    workflow_mocks.get_resume_text.assert_called_once_with("user-123")


def test_get_resume_unauthorized(client, workflow_mocks, set_current_user):
    set_current_user(None)

    resp = client.get("/resumes/")

    assert resp.status_code == 200
    assert resp.json() == {"error": "Unauthorized or invalid user"}
    workflow_mocks.get_resume_text.assert_not_called()


def test_get_resume_for_user_id(client, workflow_mocks):
    workflow_mocks.get_resume_text.return_value = {"text": "Other resume"}

    resp = client.get("/resumes/user-999")

    assert resp.status_code == 200
    assert resp.json() == {"text": "Other resume"}
    workflow_mocks.get_resume_text.assert_called_once_with("user-999")
