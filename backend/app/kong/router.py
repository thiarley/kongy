"""
Kong Proxy Router

Proxies all requests to Kong Admin API with authentication.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException

from app.middleware.auth import get_current_user
from app.kong.client import get_kong_client


router = APIRouter()



@router.post("/copy-plugins")
async def copy_plugins(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Copy plugins from one entity to another.
    
    Expected body:
    {
        "source": {"type": "route" | "service", "id": "uuid"},
        "target": {"type": "route" | "service", "id": "uuid"},
        "plugin_ids": ["uuid", "uuid"]  # Optional: only copy these
    }
    """
    source = data.get("source")
    target = data.get("target")
    plugin_ids = data.get("plugin_ids")
    
    if not source or not target:
        raise HTTPException(status_code=400, detail="Source and target are required")
        
    client = get_kong_client()
    
    # 1. Fetch source plugins
    source_type = source.get("type")
    source_id = source.get("id")
    
    # Ensure source_type is plural for the path
    path = f"/{source_type}s/{source_id}/plugins"
    plugins_response = await client.request("GET", path)
    
    if plugins_response.get("error"):
        return plugins_response
        
    plugins = plugins_response.get("data", [])
    if not plugins:
        return {"success": True, "count": 0, "message": "No plugins found in source"}
        
    # Filter by plugin_ids if provided
    if plugin_ids:
        plugins = [p for p in plugins if p["id"] in plugin_ids]
        if not plugins:
            return {"success": True, "count": 0, "message": "None of the selected plugins found"}
            
    target_type = target.get("type")
    target_id = target.get("id")
    
    createdCount = 0
    errors = []
    
    for p in plugins:
        # Clean plugin data for creation
        new_plugin = {
            "name": p["name"],
            "config": p["config"],
            "enabled": p.get("enabled", True),
            "tags": p.get("tags", []),
            "protocols": p.get("protocols", ["http", "https"])
        }
        
        # Assign to target
        new_plugin[target_type] = {"id": target_id}
        
        res = await client.request("POST", "/plugins", body=new_plugin)
        if res.get("error"):
            errors.append({
                "plugin": p["name"],
                "error": res.get("details")
            })
        else:
            createdCount += 1
            
    return {
        "success": True,
        "count": createdCount,
        "errors": errors
    }


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
