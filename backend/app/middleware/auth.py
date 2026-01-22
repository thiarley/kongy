"""
Authentication Middleware

Provides JWT token validation and user extraction.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings
from app.storage.memory import get_storage


# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate JWT token and return current user.
    
    This is a FastAPI dependency that can be used in route handlers
    to require authentication.
    
    Args:
        token: JWT token extracted from Authorization header
        
    Returns:
        User dict from storage
        
    Raises:
        HTTPException 401 if token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Get user from storage
    storage = get_storage()
    user = await storage.get_user(username)
    
    if user is None:
        raise credentials_exception
    
    # Return user without password hash
    return {
        "username": user["username"],
        "role": user.get("role", "user")
    }


async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Require admin role for a route.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User dict if admin
        
    Raises:
        HTTPException 403 if not admin
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
