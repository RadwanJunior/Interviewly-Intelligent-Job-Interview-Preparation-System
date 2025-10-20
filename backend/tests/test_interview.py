# =============================
# test_interview.py - Comprehensive tests for interview.py endpoints
# Tests all endpoints: create interview, get questions, get status
# =============================

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch
import asyncio
from types import SimpleNamespace


class AttrDict(dict):
    """Dictionary that also exposes keys as attributes."""
    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError as exc:
            raise AttributeError(item) from exc


class FakeResponse:
    """Mimics supabase client responses with optional error flag."""
    def __init__(self, data=None, error=None):
        self.data = data
        self.error = error

    def __contains__(self, key):
        return key == "error" and self.error is not None


from app.main import app

client = TestClient(app)

# =============================
# Fixtures
# =============================

@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    user = Mock()
    user.id = "test-user-123"
    user.__contains__ = Mock(return_value=False)
    return user

@pytest.fixture
def mock_resume_record():
    """Mock resume record"""
    return AttrDict({
        "id": "resume-123",
        "extracted_text": "Software Engineer with 5 years experience in Python, FastAPI, and testing."
    })

@pytest.fixture
def mock_job_record():
    """Mock job description record"""
    return AttrDict({
        "id": "job-123",
        "user_id": "test-user-123",
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "description": "Looking for experienced Python developer",
        "location": "Remote"
    })

@pytest.fixture
def mock_questions_list():
    """Mock generated questions"""
    return [
        {"question": "Tell me about yourself"},
        {"question": "What is your experience with Python?"},
        {"question": "Describe a challenging project"}
    ]

@pytest.fixture
def mock_interview_session():
    """Mock interview session"""
    return {
        "id": "session-123",
        "user_id": "test-user-123",
        "resume_id": "resume-123",
        "job_description_id": "job-123",
        "questions": []
    }

@pytest.fixture
def mock_question_records():
    """Mock inserted question records"""
    return [
        {"id": "q1", "interview_id": "session-123", "question": "Tell me about yourself", "order": 1},
        {"id": "q2", "interview_id": "session-123", "question": "What is your experience with Python?", "order": 2},
        {"id": "q3", "interview_id": "session-123", "question": "Describe a challenging project", "order": 3}
    ]

@pytest.fixture
def mock_supabase_service():
    """Mock the entire supabase_service"""
    from app.routes import interview
    original = interview.supabase_service
    mock_service = Mock()
    interview.supabase_service = mock_service
    yield mock_service
    interview.supabase_service = original

@pytest.fixture
def override_current_user():
    """Override FastAPI dependency for current user."""
    from app.services.supabase_service import supabase_service as real_service

    def _override(value):
        async def dependency(request=None):
            return value
        app.dependency_overrides[real_service.get_current_user] = dependency
    yield _override
    app.dependency_overrides.pop(real_service.get_current_user, None)

@pytest.fixture
def mock_interview_service():
    """Mock the InterviewService.generate_questions method"""
    with patch("app.routes.interview.InterviewService.generate_questions", autospec=True) as generate_questions:
        yield SimpleNamespace(generate_questions=generate_questions)

@pytest.fixture(autouse=True)
def clear_progress_store():
    """Clear PROGRESS_STORE before each test"""
    from app.routes import interview
    interview.PROGRESS_STORE.clear()
    yield
    interview.PROGRESS_STORE.clear()

# =============================
# Tests for /create endpoint
# =============================

def test_create_interview_session_success(
    mock_supabase_service,
    mock_interview_service,
    mock_user,
    override_current_user,
    mock_resume_record,
    mock_job_record,
    mock_questions_list,
    mock_interview_session,
    mock_question_records
):
    """Test successful interview session creation"""
    # Setup mocks
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job description retrieval
    mock_supabase_service.get_job_description.return_value = FakeResponse(mock_job_record)
    
    # Mock question generation
    mock_interview_service.generate_questions.return_value = mock_questions_list
    
    # Mock interview session creation
    mock_supabase_service.create_interview_session.return_value = FakeResponse([mock_interview_session])
    
    # Mock question insertion
    mock_supabase_service.insert_interview_questions.return_value = FakeResponse(mock_question_records)
    
    # Mock session update
    mock_supabase_service.update_interview_session_questions.return_value = FakeResponse({})
    
    # Make request
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["session"]["id"] == "session-123"
    assert len(result["question_ids"]) == 3
    assert result["question_ids"] == ["q1", "q2", "q3"]
    
    # Verify service calls
    mock_supabase_service.get_resume_table.assert_called_once_with("test-user-123")
    mock_supabase_service.get_job_description.assert_called_once_with("job-123")
    mock_interview_service.generate_questions.assert_called_once()


def test_create_interview_session_unauthorized_no_user(mock_supabase_service, override_current_user):
    """Test create interview with no authenticated user"""
    override_current_user(None)
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]


def test_create_interview_session_unauthorized_no_user_id(mock_supabase_service, override_current_user):
    """Test create interview with user but no user ID"""
    mock_user = Mock()
    mock_user.id = None
    override_current_user(mock_user)
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]


def test_create_interview_session_resume_not_found(mock_supabase_service, mock_user, override_current_user):
    """Test create interview when resume not found"""
    override_current_user(mock_user)
    
    # Mock resume not found
    mock_supabase_service.get_resume_table.return_value = FakeResponse([])
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 404
    assert "Resume not found" in response.json()["detail"]


def test_create_interview_session_resume_error(mock_supabase_service, mock_user, override_current_user):
    """Test create interview when resume retrieval has error"""
    override_current_user(mock_user)
    mock_supabase_service.get_resume_table.return_value = FakeResponse(data=None, error="Database error")
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 404
    assert "Resume not found" in response.json()["detail"]


def test_create_interview_session_invalid_resume_record(mock_supabase_service, mock_user, override_current_user):
    """Test create interview when resume record object is invalid"""
    override_current_user(mock_user)
    # Supabase returned a record slot but it was empty/invalid
    mock_supabase_service.get_resume_table.return_value = FakeResponse([None])
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 403
    assert "Invalid resume for this user" in response.json()["detail"]


def test_create_interview_session_job_not_found(
    mock_supabase_service,
    mock_user,
    mock_resume_record,
    override_current_user
):
    """Test create interview when job description not found"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job not found
    mock_supabase_service.get_job_description.return_value = FakeResponse(None)
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 404
    assert "Job description not found" in response.json()["detail"]


def test_create_interview_session_job_error(
    mock_supabase_service,
    mock_user,
    mock_resume_record,
    override_current_user
):
    """Test create interview when job retrieval has error"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job error
    mock_supabase_service.get_job_description.return_value = FakeResponse(data=None, error="Database error")
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 404
    assert "Job description not found" in response.json()["detail"]


def test_create_interview_session_wrong_user_job(
    mock_supabase_service,
    mock_user,
    mock_resume_record,
    mock_job_record,
    override_current_user
):
    """Test create interview when job belongs to different user"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job with different user
    different_user_job = AttrDict({"user_id": "different-user-456"})
    mock_supabase_service.get_job_description.return_value = FakeResponse(different_user_job)
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 403
    assert "Invalid job description for this user" in response.json()["detail"]


def test_create_interview_session_question_generation_failed(
    mock_supabase_service,
    mock_interview_service,
    mock_user,
    mock_resume_record,
    mock_job_record,
    override_current_user
):
    """Test create interview when question generation fails"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job description retrieval
    mock_supabase_service.get_job_description.return_value = FakeResponse(mock_job_record)
    
    # Mock question generation failure
    mock_interview_service.generate_questions.return_value = []
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 500
    assert "Failed to generate interview questions" in response.json()["detail"]


def test_create_interview_session_creation_failed(
    mock_supabase_service,
    mock_interview_service,
    mock_user,
    mock_resume_record,
    mock_job_record,
    mock_questions_list,
    override_current_user
):
    """Test create interview when session creation fails"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job description retrieval
    mock_supabase_service.get_job_description.return_value = FakeResponse(mock_job_record)
    
    # Mock question generation
    mock_interview_service.generate_questions.return_value = mock_questions_list
    
    # Mock interview session creation failure
    mock_supabase_service.create_interview_session.return_value = FakeResponse(
        data=None,
        error="Database error"
    )
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 500
    assert "Failed to create interview session" in response.json()["detail"]


def test_create_interview_session_question_insertion_failed(
    mock_supabase_service,
    mock_interview_service,
    mock_user,
    mock_resume_record,
    mock_job_record,
    mock_questions_list,
    mock_interview_session,
    override_current_user
):
    """Test create interview when question insertion fails"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job description retrieval
    mock_supabase_service.get_job_description.return_value = FakeResponse(mock_job_record)
    
    # Mock question generation
    mock_interview_service.generate_questions.return_value = mock_questions_list
    
    # Mock interview session creation
    mock_supabase_service.create_interview_session.return_value = FakeResponse([mock_interview_session])
    
    # Mock question insertion failure
    mock_supabase_service.insert_interview_questions.return_value = FakeResponse(
        data=None, error="Insertion failed"
    )
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 500
    assert "Failed to insert interview questions" in response.json()["detail"]


def test_create_interview_session_update_failed(
    mock_supabase_service,
    mock_interview_service,
    mock_user,
    mock_resume_record,
    mock_job_record,
    mock_questions_list,
    mock_interview_session,
    mock_question_records,
    override_current_user
):
    """Test create interview when session update fails"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job description retrieval
    mock_supabase_service.get_job_description.return_value = FakeResponse(mock_job_record)
    
    # Mock question generation
    mock_interview_service.generate_questions.return_value = mock_questions_list
    
    # Mock interview session creation
    mock_supabase_service.create_interview_session.return_value = FakeResponse([mock_interview_session])
    
    # Mock question insertion
    mock_supabase_service.insert_interview_questions.return_value = FakeResponse(mock_question_records)
    
    # Mock session update failure
    mock_supabase_service.update_interview_session_questions.return_value = FakeResponse(
        data=None, error="Update failed"
    )
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    assert response.status_code == 500
    assert "Failed to update interview session with questions" in response.json()["detail"]


def test_create_interview_session_filters_invalid_questions(
    mock_supabase_service,
    mock_interview_service,
    mock_user,
    mock_resume_record,
    mock_job_record,
    mock_interview_session,
    override_current_user
):
    """Ensure empty/None questions are filtered out before insertion"""
    override_current_user(mock_user)
    
    # Mock resume retrieval
    mock_supabase_service.get_resume_table.return_value = FakeResponse([mock_resume_record])
    
    # Mock job description retrieval
    mock_supabase_service.get_job_description.return_value = FakeResponse(mock_job_record)
    
    # Mock question generation with empty questions and one valid entry
    mock_interview_service.generate_questions.return_value = [
        {"question": ""},
        {"question": "Valid question"},
        {"question": None},
        {"other_field": "data"}
    ]
    
    # Mock interview session creation
    mock_supabase_service.create_interview_session.return_value = FakeResponse([mock_interview_session])
    
    # Mock question insertion (should only include the valid question)
    inserted_records = [{"id": "filtered-1"}]
    mock_supabase_service.insert_interview_questions.return_value = FakeResponse(inserted_records)
    
    # Mock session update
    mock_supabase_service.update_interview_session_questions.return_value = FakeResponse({})
    
    response = client.post("/interview/create", json={
        "job_description_id": "job-123"
    })
    
    # Should succeed with filtered question list
    assert response.status_code == 200
    result = response.json()
    assert result["question_ids"] == ["filtered-1"]
    
    inserted_args = mock_supabase_service.insert_interview_questions.call_args[0][0]
    assert len(inserted_args) == 1
    assert inserted_args[0]["question"] == "Valid question"
    # Order increments even when skipping blanks due to counter logic
    assert inserted_args[0]["order"] == 2


# =============================
# Tests for /questions/{session_id} endpoint
# =============================

def test_get_questions_success(mock_supabase_service, mock_question_records):
    """Test successful retrieval of interview questions"""
    # Mock questions retrieval
    mock_supabase_service.get_interview_question_table.return_value = FakeResponse(mock_question_records)
    
    response = client.get("/interview/questions/session-123")
    
    assert response.status_code == 200
    result = response.json()
    assert len(result) == 3
    assert result[0]["question"] == "Tell me about yourself"
    mock_supabase_service.get_interview_question_table.assert_called_once_with("session-123")


def test_get_questions_not_found(mock_supabase_service):
    """Test get questions when none found"""
    # Mock questions not found
    mock_supabase_service.get_interview_question_table.return_value = FakeResponse([])
    
    response = client.get("/interview/questions/session-123")
    
    assert response.status_code == 404
    assert "Questions not found" in response.json()["detail"]


def test_get_questions_error(mock_supabase_service):
    """Test get questions with database error"""
    # Mock error response
    mock_supabase_service.get_interview_question_table.return_value = FakeResponse(
        data=None, error="Database error"
    )
    
    response = client.get("/interview/questions/session-123")
    
    assert response.status_code == 404
    assert "Questions not found" in response.json()["detail"]


# =============================
# Tests for /status/{session_id} endpoint
# =============================

def test_get_status_in_progress():
    """Test get status when interview is in progress"""
    from app.routes import interview
    
    # Set progress manually
    interview.PROGRESS_STORE["session-123"] = 50
    
    response = client.get("/interview/status/session-123")
    
    assert response.status_code == 200
    result = response.json()
    assert result["progress"] == 50
    assert result["completed"] is False


def test_get_status_completed():
    """Test get status when interview is completed"""
    from app.routes import interview
    
    # Set progress to 100
    interview.PROGRESS_STORE["session-123"] = 100
    
    response = client.get("/interview/status/session-123")
    
    assert response.status_code == 200
    result = response.json()
    assert result["progress"] == 100
    assert result["completed"] is True


def test_get_status_not_started():
    """Test get status when interview hasn't started"""
    response = client.get("/interview/status/session-123")
    
    assert response.status_code == 200
    result = response.json()
    assert result["progress"] == 0
    assert result["completed"] is False


def test_get_status_over_100():
    """Test get status with progress over 100"""
    from app.routes import interview
    
    # Set progress over 100
    interview.PROGRESS_STORE["session-123"] = 150
    
    response = client.get("/interview/status/session-123")
    
    assert response.status_code == 200
    result = response.json()
    assert result["progress"] == 150
    assert result["completed"] is True


# =============================
# Tests for simulate_progress background task
# =============================

@pytest.mark.asyncio
async def test_simulate_progress():
    """Test the simulate_progress background task"""
    from app.routes.interview import simulate_progress, PROGRESS_STORE
    
    session_id = "test-session"
    PROGRESS_STORE.clear()
    
    # Run with a shorter timeout
    with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
        await simulate_progress(session_id)
        
        # Verify progress reached 100
        assert PROGRESS_STORE[session_id] == 100
        # Verify sleep was called multiple times
        assert mock_sleep.call_count == 10


# =============================
# Edge Cases and Validation Tests
# =============================

def test_create_interview_missing_job_description_id(mock_supabase_service, mock_user, override_current_user):
    """Test create interview with missing job_description_id"""
    override_current_user(mock_user)
    
    response = client.post("/interview/create", json={})
    
    assert response.status_code == 422  # Validation error


def test_create_interview_invalid_json(mock_supabase_service, mock_user, override_current_user):
    """Test create interview with invalid JSON"""
    override_current_user(mock_user)
    
    response = client.post(
        "/interview/create",
        data="invalid json",
        headers={"Content-Type": "application/json"}
    )
    
    assert response.status_code == 422


def test_get_questions_with_empty_session_id(mock_supabase_service):
    """Test get questions with empty session ID"""
    response = client.get("/interview/questions/")
    
    # Should return 404 or 405 depending on router config
    assert response.status_code in [404, 405]


def test_get_status_with_empty_session_id():
    """Test get status with empty session ID"""
    response = client.get("/interview/status/")
    
    # Should return 404 or 405 depending on router config
    assert response.status_code in [404, 405]
