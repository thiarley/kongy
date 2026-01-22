"""
Authentication Tests
"""

import pytest
from fastapi import status


class TestAuthStatus:
    """Tests for /api/auth/status endpoint."""
    
    def test_initial_status_needs_setup(self, client, clean_storage):
        """System should require setup when no users exist."""
        response = client.get("/api/auth/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["needs_setup"] is True
        assert data["app_name"] == "Kongy"

    def test_status_after_setup(self, client, clean_storage):
        """Status should show setup completed after user creation."""
        # Create user
        client.post("/api/auth/setup", json={
            "username": "admin",
            "password": "securepass123"
        })
        
        response = client.get("/api/auth/status")
        
        assert response.status_code == 200
        assert response.json()["needs_setup"] is False


class TestAuthSetup:
    """Tests for /api/auth/setup endpoint."""
    
    def test_setup_creates_user(self, client, clean_storage):
        """Setup should create first admin user."""
        response = client.post("/api/auth/setup", json={
            "username": "admin",
            "password": "securepass123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert "created successfully" in data["message"].lower()

    def test_setup_requires_min_password_length(self, client, clean_storage):
        """Setup should require minimum password length."""
        response = client.post("/api/auth/setup", json={
            "username": "admin",
            "password": "short"
        })
        
        assert response.status_code == 422  # Validation error

    def test_setup_only_once(self, client, clean_storage):
        """Setup should only work once."""
        # First setup
        client.post("/api/auth/setup", json={
            "username": "admin",
            "password": "firstpass123"
        })
        
        # Second setup attempt
        response = client.post("/api/auth/setup", json={
            "username": "admin2",
            "password": "secondpass123"
        })
        
        assert response.status_code == 400
        assert "already completed" in response.json()["detail"].lower()


class TestAuthLogin:
    """Tests for /api/auth/login endpoint."""
    
    def test_login_success(self, client, clean_storage):
        """Valid credentials should return JWT token."""
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
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_login_invalid_username(self, client, clean_storage):
        """Non-existent user should return 401."""
        response = client.post("/api/auth/login", data={
            "username": "nobody",
            "password": "anypass123"
        })
        
        assert response.status_code == 401

    def test_login_invalid_password(self, client, clean_storage):
        """Wrong password should return 401."""
        # Setup user
        client.post("/api/auth/setup", json={
            "username": "testuser",
            "password": "correctpass123"
        })
        
        # Login with wrong password
        response = client.post("/api/auth/login", data={
            "username": "testuser",
            "password": "wrongpass123"
        })
        
        assert response.status_code == 401


class TestAuthProtection:
    """Tests for route protection."""
    
    def test_kong_endpoint_requires_auth(self, client, clean_storage):
        """Kong endpoints should require authentication."""
        response = client.get("/api/kong/services")
        
        assert response.status_code == 401

    def test_kong_endpoint_with_valid_token(self, client, auth_headers):
        """Kong endpoints should accept valid token."""
        response = client.get("/api/kong/", headers=auth_headers)
        
        # Either 200 (Kong available) or 502 (Kong unavailable)
        # But NOT 401 (unauthorized)
        assert response.status_code in [200, 502]

    def test_me_endpoint(self, client, auth_headers):
        """Should return current user info."""
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["role"] == "admin"
