"""
Security Middleware

Provides:
- Rate limiting for all requests
- Login-specific rate limiting (brute force protection)
- Security headers
"""

from collections import defaultdict
import hashlib
import time
from typing import Dict, List

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

from app.config import settings


# In-memory rate limiting stores
_request_counts: Dict[str, List[float]] = defaultdict(list)
_login_attempts: Dict[str, List[float]] = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware.
    
    Limits requests per IP address within a time window.
    Adds security headers to all responses.
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        client_key = self._get_rate_limit_key(request)
        current_time = time.time()
        
        # Skip rate limiting for health checks, but still add security headers
        if request.url.path == "/api/health":
            response = await call_next(request)
            self._add_security_headers(response)
            return response
        
        # Clean old entries
        window_start = current_time - settings.RATE_LIMIT_WINDOW
        _request_counts[client_key] = [
            t for t in _request_counts[client_key] if t > window_start
        ]
        
        # Check rate limit
        if len(_request_counts[client_key]) >= settings.RATE_LIMIT_REQUESTS:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."}
            )
            response.headers["Retry-After"] = str(settings.RATE_LIMIT_WINDOW)
            self._add_security_headers(response)
            return response
        
        # Record this request
        _request_counts[client_key].append(current_time)
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(response)
        
        return response
    
    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to response."""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, considering proxy headers."""
        # Check for forwarded IP (when behind reverse proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP in the chain
            return forwarded.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"

    def _get_rate_limit_key(self, request: Request) -> str:
        """Prefer authenticated token identity over plain shared IPs."""
        client_ip = self._get_client_ip(request)
        auth_header = request.headers.get("Authorization", "").strip()

        if auth_header:
            token_hash = hashlib.sha256(auth_header.encode("utf-8")).hexdigest()[:16]
            return f"{client_ip}:{token_hash}"

        return client_ip


async def check_login_rate_limit(request: Request) -> None:
    """
    Check login-specific rate limiting (brute force protection).
    
    Should be called before processing login attempts.
    Raises HTTPException 429 if too many attempts.
    """
    client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not client_ip:
        client_ip = request.headers.get("X-Real-IP", "")
    if not client_ip and request.client:
        client_ip = request.client.host
    if not client_ip:
        client_ip = "unknown"
    
    current_time = time.time()
    
    # Clean old entries
    window_start = current_time - settings.LOGIN_RATE_WINDOW
    _login_attempts[client_ip] = [
        t for t in _login_attempts[client_ip] if t > window_start
    ]
    
    # Check limit
    if len(_login_attempts[client_ip]) >= settings.LOGIN_RATE_LIMIT:
        remaining_seconds = int(settings.LOGIN_RATE_WINDOW - (current_time - _login_attempts[client_ip][0]))
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Please try again in {remaining_seconds} seconds."
        )
    
    # Record this attempt
    _login_attempts[client_ip].append(current_time)


def clear_rate_limits() -> None:
    """Clear all rate limit data. Useful for testing."""
    _request_counts.clear()
    _login_attempts.clear()
