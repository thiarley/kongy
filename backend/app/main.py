"""
Kongy FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.kong.router import router as kong_router
from app.system.router import router as system_router
from app.middleware.security import RateLimitMiddleware


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Kong Gateway Manager - Open Source",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        openapi_url="/api/openapi.json" if settings.DEBUG else None,
    )
    
    # Add rate limiting middleware
    app.add_middleware(RateLimitMiddleware)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(kong_router, prefix="/api/kong", tags=["Kong Proxy"])
    app.include_router(system_router, prefix="/api", tags=["System"])
    
    @app.get("/api/health", tags=["Health"])
    async def health_check():
        """Health check endpoint for container orchestration."""
        return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
    
    return app


# Application instance
app = create_app()
