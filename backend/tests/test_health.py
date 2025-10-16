"""
test_health.py - Health check test for the FastAPI backend
Verifies that the root endpoint returns a 200 status and the expected message.
"""
def test_health_check(client):
    """
    Test that the root endpoint returns a 200 status and the correct health message.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Mock Interview Backend is running!"}