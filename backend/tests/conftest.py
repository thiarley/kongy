"""
Pytest Fixtures for Kongy Tests
"""

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.storage.memory import get_storage
from app.middleware.security import clear_rate_limits


@pytest.fixture(scope="function")
def clean_storage():
    """Reset storage before each test."""
    storage = get_storage()
    storage.clear_all()
    clear_rate_limits()
    yield storage
    # Cleanup after test
    storage.clear_all()
    clear_rate_limits()


@pytest.fixture
def client(clean_storage):
    """Synchronous test client."""
    return TestClient(app)


@pytest.fixture
async def async_client(clean_storage):
    """Asynchronous test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_token(client, clean_storage):
    """Get authenticated token for tests."""
    # Setup user
    client.post("/api/auth/setup", json={
        "username": "testuser",
        "password": "testpass123"
    })
    
    # Login
    response = client.post("/api/auth/login", data={
        "username": "testuser",
        "password": "testpass123"
    })
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}
