"""
Authentication Router

Provides endpoints for:
- Initial setup (create first admin user)
- Login (authenticate and get JWT token)
- Status check (check if setup is needed)
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, field_validator
import bcrypt
from jose import jwt

from app.config import settings
from app.storage.memory import get_storage
from app.middleware.security import check_login_rate_limit
from app.middleware.auth import get_current_user
from app.kong.client import get_kong_client


router = APIRouter()

# ==================== Helper Functions ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash using bcrypt."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')


# ==================== Request/Response Models ====================

from typing import Optional

class SetupRequest(BaseModel):
    """Request model for initial setup."""
    username: str = Field(..., min_length=3, max_length=50, description="Admin username")
    password: str = Field(..., min_length=8, max_length=72, description="Admin password (min 8 chars, max 72)")
    kong_admin_url: Optional[str] = Field(None, description="Kong Admin API URL")

    @field_validator('kong_admin_url')
    def validate_url(cls, v):
        if v and not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class SetupResponse(BaseModel):
    """Response model for setup."""
    message: str
    username: str


class TokenResponse(BaseModel):
    """Response model for login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class StatusResponse(BaseModel):
    """Response model for status check."""
    needs_setup: bool
    app_name: str
    version: str
    kong_admin_url: Optional[str] = None


class UserResponse(BaseModel):
    """Response model for current user."""
    username: str
    role: str


# ==================== Endpoints ====================

@router.get("/status", response_model=StatusResponse)
async def auth_status():
    """
    Check if the system needs initial setup.
    
    Returns:
        - needs_setup: True if no users exist yet
        - app_name: Application name
        - version: Application version
    """
    storage = get_storage()
    user_count = await storage.count_users()
    
    # Get Kong Admin URL
    kong_client = get_kong_client()
    current_url = kong_client.base_url

    return StatusResponse(
        needs_setup=user_count == 0,
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        kong_admin_url=current_url
    )


@router.post("/setup", response_model=SetupResponse)
async def initial_setup(request: SetupRequest):
    """
    Initial setup - create the first admin user.
    
    This endpoint only works if no users exist yet.
    After the first user is created, this endpoint returns an error.
    
    Args:
        request: Username and password for the admin user
        
    Returns:
        Success message and username
        
    Raises:
        HTTPException 400 if setup was already completed
    """
    storage = get_storage()
    
    # Check if setup was already done
    user_count = await storage.count_users()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Setup already completed. Please login."
        )
    
    # Hash password and create user
    password_hash = get_password_hash(request.password)
    # save key user
    user = await storage.create_user(
        username=request.username,
        password_hash=password_hash,
        role="admin"
    )

    # Configure Kong URL if provided
    if request.kong_admin_url:
        # Save connection settings for admin
        await storage.save_kong_connection(
            user["username"], 
            {"admin_url": request.kong_admin_url}
        )
        
        # Configure global client
        client = get_kong_client()
        client.configure(request.kong_admin_url)
    
    return SetupResponse(
        message="Admin user created successfully. Please login.",
        username=user["username"]
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate user and return JWT token.
    
    Uses OAuth2 password flow (form data with username and password).
    Rate limited to prevent brute force attacks.
    
    Args:
        form_data: OAuth2 form with username and password
        
    Returns:
        JWT access token
        
    Raises:
        HTTPException 401 if credentials are invalid
        HTTPException 429 if too many login attempts
    """
    # Check rate limit
    await check_login_rate_limit(request)
    
    storage = get_storage()
    
    # Get user
    user = await storage.get_user(form_data.username)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    # Create JWT token
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    token_data = {
        "sub": user["username"],
        "role": user.get("role", "user"),
        "exp": expire
    }
    
    access_token = jwt.encode(
        token_data,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    Requires valid JWT token in Authorization header.
    
    Returns:
        Current user's username and role
    """
    return UserResponse(
        username=current_user["username"],
        role=current_user["role"]
    )


@router.post("/change-password")
async def change_password(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Change current user's password.
    
    Args:
        request: JSON body with old_password, new_password
        
    Returns:
        Success message
        
    Raises:
        HTTPException 400 if validation fails
        HTTPException 401 if old password incorrect
    """
    data = await request.json()
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Missing old_password or new_password")
        
    if len(new_password) < 8:
         raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    storage = get_storage()
    
    # Get full user data (to verify password)
    username = current_user["username"]
    user = await storage.get_user(username)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Verify old password
    if not verify_password(old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    # Update password
    new_hash = get_password_hash(new_password)
    await storage.update_user(username, {"password_hash": new_hash})
    
    return {"message": "Password updated successfully"}


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.
    
    Returns:
        Success message
    """
    return {"message": "Logged out successfully"}
