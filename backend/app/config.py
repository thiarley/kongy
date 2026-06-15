"""
Kongy Configuration Module

All settings are loaded from environment variables with sensible defaults.
"""

import os
import json
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings


def _get_version() -> str:
    # 1. Try environment variable
    if os.getenv("VERSION"):
        return os.getenv("VERSION")
    
    # 2. Try backend/app/version.txt (created by CI/CD pipeline / build script)
    version_txt = Path(__file__).parent / "version.txt"
    if version_txt.exists():
        try:
            return version_txt.read_text(encoding="utf-8").strip()
        except Exception:
            pass
            
    # 3. Try frontend/package.json (for local development)
    package_json = Path(__file__).parent.parent.parent / "frontend" / "package.json"
    if package_json.exists():
        try:
            with open(package_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "version" in data:
                    return data["version"]
        except Exception:
            pass
            
    # 4. Fallback default
    return "1.0.0-dev"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Kongy"
    APP_VERSION: str = _get_version()
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
    RATE_LIMIT_REQUESTS: int = 10000
    RATE_LIMIT_WINDOW: int = 60  # seconds
    LOGIN_RATE_LIMIT: int = 5
    LOGIN_RATE_WINDOW: int = 300  # 5 minutes lockout after failed attempts
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Singleton settings instance
settings = Settings()
