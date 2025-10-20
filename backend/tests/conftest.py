# =============================
# conftest.py - Pytest fixtures for FastAPI app testing
# Provides a reusable test client for API endpoint tests.
# =============================

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """
    Pytest fixture that provides a FastAPI TestClient instance.
    Use this fixture in your tests to make requests to the FastAPI app without running a server.
    """
    return TestClient(app)