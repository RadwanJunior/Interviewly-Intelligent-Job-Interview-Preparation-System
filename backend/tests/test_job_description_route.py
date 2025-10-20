# Tests for job description API route

import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.main import app
from app.services.supabase_service import supabase_service as real_supabase_service


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def workflow_mock():
    from app.routes import job_description

    original = job_description.workflow_service
    mock = MagicMock()
    job_description.workflow_service = mock
    try:
        yield mock
    finally:
        job_description.workflow_service = original


@pytest.fixture
def set_current_user():
    def _set(user):
        def dependency(request=None):
            return user
        app.dependency_overrides[real_supabase_service.get_current_user] = dependency

    yield _set
    app.dependency_overrides.pop(real_supabase_service.get_current_user, None)


def _payload():
    return {
        "job_title": "Software Engineer",
        "company_name": "Shopify",
        "location": "Remote",
        "job_type": "Full-time",
        "description": "Build awesome products",
    }


def test_create_job_description_success(client, workflow_mock, set_current_user):
    set_current_user(SimpleNamespace(id="user-123"))
    workflow_mock.create_job_description.return_value = {"id": "jd-1"}

    resp = client.post("/job_description/", json=_payload())

    assert resp.status_code == 200
    assert resp.json() == {"id": "jd-1"}
    workflow_mock.create_job_description.assert_called_once_with(
        user_id="user-123",
        job_title="Software Engineer",
        company_name="Shopify",
        location="Remote",
        job_type="Full-time",
        description="Build awesome products",
    )


def test_create_job_description_unauthorized(client, workflow_mock, set_current_user):
    set_current_user(None)

    resp = client.post("/job_description/", json=_payload())

    assert resp.status_code == 200
    assert resp.json() == {"error": "Unauthorized or invalid user"}
    workflow_mock.create_job_description.assert_not_called()


def test_create_job_description_service_error(client, workflow_mock, set_current_user):
    set_current_user(SimpleNamespace(id="user-123"))
    workflow_mock.create_job_description.return_value = {"error": {"message": "db error"}}

    resp = client.post("/job_description/", json=_payload())

    assert resp.status_code == 500
    assert resp.json()["detail"] == "db error"
