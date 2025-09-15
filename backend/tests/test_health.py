# file test api health check
def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Mock Interview Backend is running!"}