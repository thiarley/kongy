from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.kong.client import get_kong_client

router = APIRouter(prefix="/system", tags=["System"])

class ConnectionConfig(BaseModel):
    kong_admin_url: str

@router.get("/config/connection")
async def get_connection_config(user: dict = Depends(get_current_user)):
    """Get current Kong Admin API connection settings."""
    client = get_kong_client()
    return {"kong_admin_url": client.base_url}

@router.post("/config/connection")
async def update_connection_config(
        config: ConnectionConfig, 
        user: dict = Depends(get_current_user)
    ):
    """
    Update Kong Admin API connection URL.
    Validates connection before applying.
    Reverts if validation fails.
    """
    client = get_kong_client()
    
    # Store original URL for rollback
    original_url = client.base_url
    
    try:
        # Apply new config
        new_url = config.kong_admin_url.rstrip("/")
        client.configure(new_url)
        
        # Test connection (GET /)
        status = await client.get_status()
        
        if status.get("error"):
             raise Exception(status.get("details", {}).get("message", "Connection refused"))
             
        return {
            "message": "Connection updated successfully", 
            "kong_version": status.get("version", "unknown"),
            "url": new_url
        }
        
    except Exception as e:
        # Rollback
        client.configure(original_url)
        raise HTTPException(status_code=400, detail=f"Failed to connect to Kong at {config.kong_admin_url}: {str(e)}")
