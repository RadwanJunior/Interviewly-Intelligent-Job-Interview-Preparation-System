import pytest
from fastapi.testclient import TestClient
from app.main import app
import io
import uuid
@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_resume_file():
    """Create a mock PDF file for resume upload tests."""
    content = b"%PDF-1.5\nMock PDF content for testing"
    return {
        "file": io.BytesIO(content),
        "filename": f"test_resume_{uuid.uuid4().hex[:8]}.pdf",
        "content_type": "application/pdf"
    }

@pytest.fixture
def mock_docx_file():
    """Create a mock DOCX file for resume upload tests."""
    content = b"Mock DOCX content for testing"
    return {
        "file": io.BytesIO(content),
        "filename": f"test_resume_{uuid.uuid4().hex[:8]}.docx",
        "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }

@pytest.fixture
def mock_audio_file():
    """Create a mock audio file for interview response tests."""
    content = b"Mock audio content for testing"
    return {
        "file": io.BytesIO(content),
        "filename": f"test_audio_{uuid.uuid4().hex[:8]}.webm",
        "content_type": "audio/webm"
    }