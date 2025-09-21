from fastapi.testclient import TestClient
from app.main import app

class TestHealthEndpoints:
    """Tests for application health endpoints and documentation."""
    
    # Using global client fixture from conftest.py
    
    def test_health_check(self, client):
        """Test the root health check endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "AI Mock Interview Backend is running!"}