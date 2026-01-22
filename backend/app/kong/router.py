"""
Kong Proxy Router

Proxies all requests to Kong Admin API with authentication.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException

from app.middleware.auth import get_current_user
from app.kong.client import get_kong_client


router = APIRouter()


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def kong_proxy(
    path: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Proxy all requests to Kong Admin API.
    
    This endpoint requires authentication. All requests are forwarded
    to Kong Admin API with the same method, path, query params, and body.
    
    Args:
        path: Kong API path (e.g., services, routes/123, plugins)
        request: FastAPI request object
        current_user: Authenticated user (injected by dependency)
        
    Returns:
        Response from Kong Admin API
    """
    client = get_kong_client()
    method = request.method
    
    # Get body for POST/PUT/PATCH
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.json()
        except Exception:
            # No body or invalid JSON
            pass
    
    # Get query params
    params = dict(request.query_params)
    
    # Make request to Kong
    response = await client.request(
        method=method,
        path=f"/{path}",
        body=body,
        params=params if params else None
    )
    
    # Check for connection errors
    if response.get("error") and response.get("status") == 502:
        raise HTTPException(
            status_code=502,
            detail=response.get("details", {}).get("message", "Kong Admin API unavailable")
        )
    
    return response


@router.get("/", summary="Kong Status")
async def kong_status(current_user: dict = Depends(get_current_user)):
    """
    Get Kong node status.
    
    Returns Kong version, configuration, and available plugins.
    """
    client = get_kong_client()
    return await client.get_status()
