"""
Kongy Configuration Module

All settings are loaded from environment variables with sensible defaults.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Kongy"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    
    # Kong Admin API
    KONG_ADMIN_URL: str = "http://kong:8001"
    KONG_TIMEOUT: int = 30  # seconds
    
    # JWT Configuration
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # Security - Rate Limiting
    CORS_ORIGINS: List[str] = ["http://localhost:8080", "http://localhost:3000"]
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    LOGIN_RATE_LIMIT: int = 5
    LOGIN_RATE_WINDOW: int = 300  # 5 minutes lockout after failed attempts
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Singleton settings instance
settings = Settings()
