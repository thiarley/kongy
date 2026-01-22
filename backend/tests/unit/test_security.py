"""
Security Middleware Tests
"""

import pytest
from unittest.mock import MagicMock

from app.middleware.security import (
    check_login_rate_limit,
    clear_rate_limits,
    _login_attempts
)
from fastapi import HTTPException


class TestLoginRateLimiting:
    """Tests for login rate limiting."""
    
    @pytest.fixture(autouse=True)
    def clean_rate_limits(self):
        """Clear rate limit state before each test."""
        clear_rate_limits()
        yield
        clear_rate_limits()

    def _make_request(self, ip: str):
        """Create a mock request with given IP."""
        request = MagicMock()
        request.client.host = ip
        request.headers = {}
        return request

    @pytest.mark.asyncio
    async def test_allows_first_attempts(self):
        """Should allow first few login attempts."""
        request = self._make_request("127.0.0.1")
        
        # Should not raise for first 5 attempts
        for _ in range(5):
            await check_login_rate_limit(request)

    @pytest.mark.asyncio
    async def test_blocks_after_limit(self):
        """Should block after too many attempts."""
        request = self._make_request("127.0.0.1")
        
        # Make 5 attempts
        for _ in range(5):
            await check_login_rate_limit(request)
        
        # 6th should be blocked
        with pytest.raises(HTTPException) as exc_info:
            await check_login_rate_limit(request)
        
        assert exc_info.value.status_code == 429
        assert "too many" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_different_ips_independent(self):
        """Different IPs should have independent limits."""
        request1 = self._make_request("192.168.1.1")
        request2 = self._make_request("192.168.1.2")
        
        # Max out IP1
        for _ in range(5):
            await check_login_rate_limit(request1)
        
        # IP2 should still work
        await check_login_rate_limit(request2)  # Should not raise

    @pytest.mark.asyncio
    async def test_respects_forwarded_header(self):
        """Should use X-Forwarded-For header when present."""
        request = MagicMock()
        request.client.host = "127.0.0.1"
        request.headers = {"X-Forwarded-For": "10.0.0.1, 10.0.0.2"}
        
        # This should use 10.0.0.1 as the client IP
        for _ in range(5):
            await check_login_rate_limit(request)
        
        # Should be blocked now
        with pytest.raises(HTTPException):
            await check_login_rate_limit(request)
        
        # But direct IP should still work
        request2 = MagicMock()
        request2.client.host = "127.0.0.1"
        request2.headers = {}
        
        await check_login_rate_limit(request2)  # Should not raise


class TestSecurityHeaders:
    """Tests for security headers middleware."""
    
    def test_health_check_has_security_headers(self, client):
        """Health check should have security headers."""
        response = client.get("/api/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"

    def test_auth_endpoints_have_security_headers(self, client):
        """Auth endpoints should have security headers."""
        response = client.get("/api/auth/status")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("Cache-Control") == "no-store, no-cache, must-revalidate"
