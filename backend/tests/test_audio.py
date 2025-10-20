# =============================
# test_audio.py - Comprehensive tests for audio.py endpoints
# Tests all endpoints: upload, status, feedback, generate, and generate_test
# =============================

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from io import BytesIO

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
    # Make the mock support 'in' operator (returns False for "error" in user)
    user.__contains__ = Mock(return_value=False)
    return user

@pytest.fixture
def sample_recording_data():
    """Sample recording data returned from upload"""
    return {
        "id": "recording-123",
        "interview_id": "interview-456",
        "question_id": "question-789",
        "audio_url": "https://storage.example.com/audio.wav"
    }

@pytest.fixture
def sample_feedback_data():
    """Sample feedback data"""
    return {
        "id": "feedback-123",
        "interview_id": "interview-456",
        "feedback_data": {
            "overall_score": 85,
            "strengths": ["Clear communication"],
            "improvements": ["More specific examples"]
        }
    }

@pytest.fixture(autouse=True)
def clear_feedback_status():
    """Clear feedback_status dict before each test"""
    from app.routes import audio
    audio.feedback_status.clear()
    yield
    audio.feedback_status.clear()

@pytest.fixture
def mock_supabase_service():
    """Mock the entire supabase_service"""
    from app.routes import audio
    original = audio.supabase_service
    mock_service = Mock()
    audio.supabase_service = mock_service
    yield mock_service
    audio.supabase_service = original

@pytest.fixture
def mock_feedback_service():
    """Mock the entire feedback_service"""
    from app.routes import audio
    original = audio.feedback_service
    mock_service = Mock()
    audio.feedback_service = mock_service
    yield mock_service
    audio.feedback_service = original

# =============================
# Tests for /upload endpoint
# =============================

def test_upload_audio_success_not_last_question(mock_supabase_service, mock_feedback_service, mock_user, sample_recording_data):
    """Test successful audio upload for non-last question"""
    # Setup mocks
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_feedback_service.upload_audio_file = AsyncMock(return_value=sample_recording_data)
    
    # Prepare form data
    files = {"file": ("test.wav", b"fake audio data", "audio/wav")}
    data = {
        "interview_id": "interview-456",
        "question_id": "question-789",
        "question_text": "Tell me about yourself",
        "question_order": "1",
        "is_last_question": "false",
        "mime_type": "audio/wav"
    }
    
    # Make request
    response = client.post("/audio/upload", files=files, data=data)
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert result["message"] == "Audio uploaded successfully."
    assert "recording" in result


def test_upload_audio_success_last_question(mock_supabase_service, mock_feedback_service, mock_user, sample_recording_data):
    """Test successful audio upload for last question (triggers background task)"""
    # Setup mocks
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_feedback_service.upload_audio_file = AsyncMock(return_value=sample_recording_data)
    
    # Prepare form data
    files = {"file": ("test.wav", b"fake audio data", "audio/wav")}
    data = {
        "interview_id": "interview-456",
        "question_id": "question-789",
        "question_text": "Tell me about yourself",
        "question_order": "3",
        "is_last_question": "true",
        "mime_type": "audio/wav"
    }
    
    # Make request
    response = client.post("/audio/upload", files=files, data=data)
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert "Feedback generation started" in result["message"]


def test_upload_audio_authentication_failure(mock_supabase_service):
    """Test upload with authentication failure"""
    # Create a mock that will fail the "error" in user check
    error_user = {"error": "Unauthorized"}
    mock_supabase_service.get_current_user.return_value = error_user
    
    # Prepare form data
    files = {"file": ("test.wav", b"fake audio data", "audio/wav")}
    data = {
        "interview_id": "interview-456",
        "question_id": "question-789",
        "question_text": "Tell me about yourself",
        "question_order": "1",
        "is_last_question": "false",
        "mime_type": "audio/wav"
    }
    
    # Make request
    response = client.post("/audio/upload", files=files, data=data)
    
    # Assertions
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_upload_audio_authentication_no_user(mock_supabase_service):
    """Test upload with no user returned"""
    mock_supabase_service.get_current_user.return_value = None
    
    # Prepare form data
    files = {"file": ("test.wav", b"fake audio data", "audio/wav")}
    data = {
        "interview_id": "interview-456",
        "question_id": "question-789",
        "question_text": "Tell me about yourself",
        "question_order": "1",
        "is_last_question": "false",
        "mime_type": "audio/wav"
    }
    
    # Make request
    response = client.post("/audio/upload", files=files, data=data)
    
    # Assertions
    assert response.status_code == 401


def test_upload_audio_service_error(mock_supabase_service, mock_feedback_service, mock_user):
    """Test upload with service error"""
    # Setup mocks
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_feedback_service.upload_audio_file = AsyncMock(side_effect=Exception("Upload failed"))
    
    # Prepare form data
    files = {"file": ("test.wav", b"fake audio data", "audio/wav")}
    data = {
        "interview_id": "interview-456",
        "question_id": "question-789",
        "question_text": "Tell me about yourself",
        "question_order": "1",
        "is_last_question": "false",
        "mime_type": "audio/wav"
    }
    
    # Make request
    response = client.post("/audio/upload", files=files, data=data)
    
    # Assertions
    assert response.status_code == 500
    assert "Error uploading audio" in response.json()["detail"]


# =============================
# Tests for generate_feedback_background
# =============================

@pytest.mark.asyncio
async def test_generate_feedback_background_success():
    """Test successful background feedback generation"""
    from app.routes import audio
    
    with patch.object(audio.feedback_service, 'generate_feedback', new_callable=AsyncMock) as mock_generate, \
         patch.object(audio.supabase_service, 'update_user_responses_processed') as mock_update:
        
        # Call function
        await audio.generate_feedback_background("interview-456", "user-123")
        
        # Assertions
        mock_generate.assert_called_once_with("interview-456", "user-123")
        mock_update.assert_called_once_with("interview-456")
        assert audio.feedback_status["interview-456"]["status"] == "completed"


@pytest.mark.asyncio
async def test_generate_feedback_background_error():
    """Test background feedback generation with error"""
    from app.routes import audio
    
    error_msg = "AI service unavailable"
    with patch.object(audio.feedback_service, 'generate_feedback', 
                     new_callable=AsyncMock, 
                     side_effect=Exception(error_msg)):
        
        # Call function
        await audio.generate_feedback_background("interview-456", "user-123")
        
        # Assertions
        assert audio.feedback_status["interview-456"]["status"] == "error"
        assert audio.feedback_status["interview-456"]["error"] == error_msg


# =============================
# Tests for /status/{interview_id} endpoint
# =============================

def test_check_feedback_status_from_memory(mock_supabase_service, mock_user):
    """Test checking status when it exists in memory"""
    from app.routes import audio
    
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    audio.feedback_status["interview-456"] = {"status": "processing"}
    
    # Make request
    response = client.get("/audio/status/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "processing"


def test_check_feedback_status_from_db_list(mock_supabase_service, mock_user):
    """Test checking status from database (list response)"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.return_value = [{"id": "feedback-123", "feedback_data": {}}]
    
    # Make request
    response = client.get("/audio/status/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "completed"
    assert result["feedback_id"] == "feedback-123"


def test_check_feedback_status_from_db_dict(mock_supabase_service, mock_user):
    """Test checking status from database (dict response)"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.return_value = {"id": "feedback-123", "feedback_data": {}}
    
    # Make request
    response = client.get("/audio/status/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "completed"
    assert result["feedback_id"] == "feedback-123"


def test_check_feedback_status_not_started(mock_supabase_service, mock_user):
    """Test checking status when feedback not started"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.return_value = None
    
    # Make request
    response = client.get("/audio/status/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "not_started"


def test_check_feedback_status_auth_failure(mock_supabase_service):
    """Test status check with authentication failure"""
    error_user = {"error": "Unauthorized"}
    mock_supabase_service.get_current_user.return_value = error_user
    
    # Make request
    response = client.get("/audio/status/interview-456")
    
    # Assertions
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_check_feedback_status_error(mock_supabase_service, mock_user):
    """Test status check with error"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.side_effect = Exception("Database error")
    
    # Make request
    response = client.get("/audio/status/interview-456")
    
    # Assertions
    assert response.status_code == 500
    assert "Error checking feedback status" in response.json()["detail"]


# =============================
# Tests for /feedback/{interview_id} endpoint
# =============================

def test_get_feedback_processing(mock_supabase_service, mock_user):
    """Test get feedback when processing"""
    from app.routes import audio
    
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    audio.feedback_status["interview-456"] = {"status": "processing"}
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "processing"
    assert "in progress" in result["message"]


def test_get_feedback_error_status(mock_supabase_service, mock_user):
    """Test get feedback when error occurred"""
    from app.routes import audio
    
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    audio.feedback_status["interview-456"] = {
        "status": "error",
        "error": "AI service failed"
    }
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "error"
    assert "AI service failed" in result["message"]


def test_get_feedback_success_list(mock_supabase_service, mock_user, sample_feedback_data):
    """Test get feedback success (list response from DB)"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.return_value = [sample_feedback_data]
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert result["feedback"] == sample_feedback_data["feedback_data"]


def test_get_feedback_success_dict(mock_supabase_service, mock_user, sample_feedback_data):
    """Test get feedback success (dict response from DB)"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.return_value = sample_feedback_data
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert result["feedback"] == sample_feedback_data["feedback_data"]


def test_get_feedback_not_found(mock_supabase_service, mock_user):
    """Test get feedback when not found"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.return_value = None
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "not_found"
    assert "No feedback found" in result["message"]


def test_get_feedback_auth_failure(mock_supabase_service):
    """Test get feedback with authentication failure"""
    error_user = {"error": "Unauthorized"}
    mock_supabase_service.get_current_user.return_value = error_user
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_get_feedback_error(mock_supabase_service, mock_user):
    """Test get feedback with error"""
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    mock_supabase_service.get_feedback.side_effect = Exception("Database error")
    
    # Make request
    response = client.get("/audio/feedback/interview-456")
    
    # Assertions
    assert response.status_code == 500
    assert "Error retrieving feedback" in response.json()["detail"]


# =============================
# Tests for /generate/{interview_id} endpoint
# =============================

def test_trigger_feedback_generation_success(mock_supabase_service, mock_user):
    """Test successful manual trigger of feedback generation"""
    from app.routes import audio
    
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    audio.feedback_status.pop("interview-456", None)
    
    with patch.object(audio, 'generate_feedback_background', new_callable=AsyncMock) as mock_background:
        # Make request
        response = client.post("/audio/generate/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert "Feedback generation started" in result["message"]
    assert "interview-456" in audio.feedback_status
    assert audio.feedback_status["interview-456"]["status"] == "processing"


def test_trigger_feedback_generation_already_processing(mock_supabase_service, mock_user):
    """Test trigger when already processing"""
    from app.routes import audio
    
    # Setup
    mock_supabase_service.get_current_user.return_value = mock_user
    audio.feedback_status["interview-456"] = {"status": "processing"}
    
    # Make request
    response = client.post("/audio/generate/interview-456")
    
    # Assertions
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "already_processing"
    assert "already in progress" in result["message"]


def test_trigger_feedback_generation_auth_failure(mock_supabase_service):
    """Test trigger with authentication failure"""
    error_user = {"error": "Unauthorized"}
    mock_supabase_service.get_current_user.return_value = error_user
    
    # Make request
    response = client.post("/audio/generate/interview-456")
    
    # Assertions
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_trigger_feedback_generation_error(mock_supabase_service):
    """Test trigger with error"""
    mock_supabase_service.get_current_user.side_effect = Exception("System error")
    
    # Make request
    response = client.post("/audio/generate/interview-456")
    
    # Assertions
    assert response.status_code == 500
    assert "Error triggering feedback generation" in response.json()["detail"]


# =============================
# Tests for /generate_test/{interview_id} endpoint
# =============================

def test_feedback_generation_test_success():
    """Test endpoint for testing feedback generation"""
    from app.routes import audio
    
    test_feedback = {"score": 90, "comments": "Great job"}
    
    with patch.object(audio.feedback_service, 'generate_feedback', 
               new_callable=AsyncMock, 
               return_value=test_feedback):
        
        # Make request
        response = client.post("/audio/generate_test/interview-456?user_id=user-123")
        
        # Assertions
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "success"
        assert "test completed" in result["message"]
        assert result["feedback"] == test_feedback


def test_feedback_generation_test_error():
    """Test endpoint with error"""
    from app.routes import audio
    
    with patch.object(audio.feedback_service, 'generate_feedback', 
               new_callable=AsyncMock, 
               side_effect=Exception("Test failed")):
        
        # Make request
        response = client.post("/audio/generate_test/interview-456?user_id=user-123")
        
        # Assertions
        assert response.status_code == 500
        assert response.json()["detail"] == "Error in feedback generation test: Test failed"


def test_feedback_generation_test_http_exception_propagation():
    """Ensure HTTPException raised by service propagates unchanged."""
    from app.routes import audio
    from fastapi import HTTPException
    
    http_error = HTTPException(status_code=409, detail="Already running")
    
    with patch.object(
        audio.feedback_service,
        'generate_feedback',
        new_callable=AsyncMock,
        side_effect=http_error
    ):
        response = client.post("/audio/generate_test/interview-456?user_id=user-123")
    
    assert response.status_code == 409
    assert response.json()["detail"] == "Already running"


# =============================
# Edge Cases and Integration Tests
# =============================

def test_upload_missing_required_fields(mock_user):
    """Test upload with missing required fields"""
    with patch('app.routes.audio.supabase_service.get_current_user', return_value=mock_user):
        # Prepare incomplete form data
        files = {"file": ("test.wav", b"fake audio data", "audio/wav")}
        data = {
            "interview_id": "interview-456",
            # Missing question_id, question_text, etc.
        }
        
        # Make request
        response = client.post("/audio/upload", files=files, data=data)
        
        # Assertions
        assert response.status_code == 422  # Validation error


def test_check_feedback_status_empty_list_from_db(mock_user):
    """Test status check when DB returns empty list"""
    with patch('app.routes.audio.supabase_service.get_current_user', return_value=mock_user), \
         patch('app.routes.audio.supabase_service.get_feedback', return_value=[]):
        
        response = client.get("/audio/status/interview-456")
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "not_started"


def test_get_feedback_empty_list_from_db(mock_user):
    """Test get feedback when DB returns empty list"""
    with patch('app.routes.audio.supabase_service.get_current_user', return_value=mock_user), \
         patch('app.routes.audio.supabase_service.get_feedback', return_value=[]):
        
        response = client.get("/audio/feedback/interview-456")
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "not_found"


def test_check_feedback_status_list_without_id(mock_user):
    """Test status check when feedback list item has no id"""
    with patch('app.routes.audio.supabase_service.get_current_user', return_value=mock_user), \
         patch('app.routes.audio.supabase_service.get_feedback', return_value=[{"feedback_data": {}}]):
        
        response = client.get("/audio/status/interview-456")
        
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "completed"
        assert result["feedback_id"] is None
