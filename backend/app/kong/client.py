"""
Kong Admin API Client

Provides a clean interface for communicating with Kong Admin API.
"""

from typing import Optional, Dict, Any
import httpx

from app.config import settings


class KongClient:
    """
    HTTP client for Kong Admin API.
    
    Provides async methods for all Kong Admin API operations.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.KONG_ADMIN_URL).rstrip("/")
        self.timeout = settings.KONG_TIMEOUT
        
    def configure(self, base_url: str):
        """Update client configuration."""
        self.base_url = base_url.rstrip("/")
    
    async def request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Make a request to Kong Admin API.
        
        Args:
            method: HTTP method (GET, POST, PUT, PATCH, DELETE)
            path: API path (e.g., /services, /routes/123)
            body: Request body for POST/PUT/PATCH
            params: Query parameters
            
        Returns:
            Response JSON as dict, or error dict with 'error' key
            
        Raises:
            HTTPException for connection errors (502 Bad Gateway)
        """
        # Ensure path starts with /
        if not path.startswith("/"):
            path = "/" + path
        
        url = f"{self.base_url}{path}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=body,
                    params=params
                )
                
                # Handle empty responses (e.g., DELETE 204)
                if response.status_code == 204 or not response.content:
                    return {"status": response.status_code}
                
                # Handle error responses
                if response.status_code >= 400:
                    try:
                        error_body = response.json()
                    except Exception:
                        error_body = {"message": response.text}
                    
                    return {
                        "error": True,
                        "status": response.status_code,
                        "details": error_body
                    }
                
                # Success response
                return response.json()
                
            except httpx.RequestError as e:
                return {
                    "error": True,
                    "status": 502,
                    "details": {
                        "message": f"Kong Admin API unavailable: {str(e)}",
                        "url": url
                    }
                }
    
    # ==================== Convenience Methods ====================
    
    async def get_status(self) -> Dict[str, Any]:
        """Get Kong node status."""
        return await self.request("GET", "/")
    
    async def get_services(self, **params) -> Dict[str, Any]:
        """List all services."""
        return await self.request("GET", "/services", params=params)
    
    async def get_service(self, id_or_name: str) -> Dict[str, Any]:
        """Get a specific service."""
        return await self.request("GET", f"/services/{id_or_name}")
    
    async def get_routes(self, **params) -> Dict[str, Any]:
        """List all routes."""
        return await self.request("GET", "/routes", params=params)
    
    async def get_route(self, id_or_name: str) -> Dict[str, Any]:
        """Get a specific route."""
        return await self.request("GET", f"/routes/{id_or_name}")
    
    async def get_plugins(self, **params) -> Dict[str, Any]:
        """List all plugins."""
        return await self.request("GET", "/plugins", params=params)
    
    async def get_enabled_plugins(self) -> Dict[str, Any]:
        """Get list of enabled plugins on this Kong node."""
        return await self.request("GET", "/plugins/enabled")
    
    async def get_plugin_schema(self, plugin_name: str) -> Dict[str, Any]:
        """Get configuration schema for a plugin."""
        return await self.request("GET", f"/plugins/schema/{plugin_name}")
    
    async def get_consumers(self, **params) -> Dict[str, Any]:
        """List all consumers."""
        return await self.request("GET", "/consumers", params=params)
    
    async def get_consumer(self, id_or_username: str) -> Dict[str, Any]:
        """Get a specific consumer."""
        return await self.request("GET", f"/consumers/{id_or_username}")
    
    async def create_consumer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new consumer."""
        return await self.request("POST", "/consumers", body=data)
    
    async def update_consumer(self, id_or_username: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a consumer."""
        return await self.request("PATCH", f"/consumers/{id_or_username}", body=data)
    
    async def delete_consumer(self, id_or_username: str) -> Dict[str, Any]:
        """Delete a consumer."""
        return await self.request("DELETE", f"/consumers/{id_or_username}")
    
    # ==================== Services CRUD ====================
    
    async def create_service(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new service."""
        return await self.request("POST", "/services", body=data)
    
    async def update_service(self, id_or_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a service."""
        return await self.request("PATCH", f"/services/{id_or_name}", body=data)
    
    async def delete_service(self, id_or_name: str) -> Dict[str, Any]:
        """Delete a service."""
        return await self.request("DELETE", f"/services/{id_or_name}")
    
    # ==================== Routes CRUD ====================
    
    async def create_route(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new route."""
        return await self.request("POST", "/routes", body=data)
    
    async def update_route(self, id_or_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a route."""
        return await self.request("PATCH", f"/routes/{id_or_name}", body=data)
    
    async def delete_route(self, id_or_name: str) -> Dict[str, Any]:
        """Delete a route."""
        return await self.request("DELETE", f"/routes/{id_or_name}")
    
    async def get_service_routes(self, service_id: str, **params) -> Dict[str, Any]:
        """List all routes for a specific service."""
        return await self.request("GET", f"/services/{service_id}/routes", params=params)
    
    # ==================== Plugins CRUD ====================
    
    async def get_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """Get a specific plugin."""
        return await self.request("GET", f"/plugins/{plugin_id}")
    
    async def create_plugin(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new plugin."""
        return await self.request("POST", "/plugins", body=data)
    
    async def update_plugin(self, plugin_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a plugin."""
        return await self.request("PATCH", f"/plugins/{plugin_id}", body=data)
    
    async def delete_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """Delete a plugin."""
        return await self.request("DELETE", f"/plugins/{plugin_id}")
    
    # ==================== Upstreams CRUD ====================
    
    async def get_upstreams(self, **params) -> Dict[str, Any]:
        """List all upstreams."""
        return await self.request("GET", "/upstreams", params=params)
    
    async def get_upstream(self, id_or_name: str) -> Dict[str, Any]:
        """Get a specific upstream."""
        return await self.request("GET", f"/upstreams/{id_or_name}")
    
    async def create_upstream(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new upstream."""
        return await self.request("POST", "/upstreams", body=data)
    
    async def update_upstream(self, id_or_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an upstream."""
        return await self.request("PATCH", f"/upstreams/{id_or_name}", body=data)
    
    async def delete_upstream(self, id_or_name: str) -> Dict[str, Any]:
        """Delete an upstream."""
        return await self.request("DELETE", f"/upstreams/{id_or_name}")
    
    # ==================== Targets (nested under Upstreams) ====================
    
    async def get_targets(self, upstream_id: str, **params) -> Dict[str, Any]:
        """List all targets for a specific upstream."""
        return await self.request("GET", f"/upstreams/{upstream_id}/targets", params=params)
    
    async def create_target(self, upstream_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new target for an upstream."""
        return await self.request("POST", f"/upstreams/{upstream_id}/targets", body=data)
    
    async def delete_target(self, upstream_id: str, target_id: str) -> Dict[str, Any]:
        """Delete a target from an upstream."""
        return await self.request("DELETE", f"/upstreams/{upstream_id}/targets/{target_id}")
    
    # ==================== Certificates CRUD ====================
    
    async def get_certificates(self, **params) -> Dict[str, Any]:
        """List all certificates."""
        return await self.request("GET", "/certificates", params=params)
    
    async def get_certificate(self, certificate_id: str) -> Dict[str, Any]:
        """Get a specific certificate."""
        return await self.request("GET", f"/certificates/{certificate_id}")
    
    async def create_certificate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new certificate."""
        return await self.request("POST", "/certificates", body=data)
    
    async def update_certificate(self, certificate_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a certificate."""
        return await self.request("PATCH", f"/certificates/{certificate_id}", body=data)
    
    async def delete_certificate(self, certificate_id: str) -> Dict[str, Any]:
        """Delete a certificate."""
        return await self.request("DELETE", f"/certificates/{certificate_id}")
    
    # ==================== SNIs ====================
    
    async def get_snis(self, **params) -> Dict[str, Any]:
        """List all SNIs."""
        return await self.request("GET", "/snis", params=params)
    
    async def get_sni(self, id_or_name: str) -> Dict[str, Any]:
        """Get a specific SNI."""
        return await self.request("GET", f"/snis/{id_or_name}")
    
    async def create_sni(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new SNI."""
        return await self.request("POST", "/snis", body=data)
    
    async def delete_sni(self, id_or_name: str) -> Dict[str, Any]:
        """Delete an SNI."""
        return await self.request("DELETE", f"/snis/{id_or_name}")
    
    # ==================== CA Certificates ====================
    
    async def get_ca_certificates(self, **params) -> Dict[str, Any]:
        """List all CA certificates."""
        return await self.request("GET", "/ca_certificates", params=params)
    
    async def get_ca_certificate(self, certificate_id: str) -> Dict[str, Any]:
        """Get a specific CA certificate."""
        return await self.request("GET", f"/ca_certificates/{certificate_id}")
    
    async def create_ca_certificate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new CA certificate."""
        return await self.request("POST", "/ca_certificates", body=data)
    
    async def delete_ca_certificate(self, certificate_id: str) -> Dict[str, Any]:
        """Delete a CA certificate."""
        return await self.request("DELETE", f"/ca_certificates/{certificate_id}")


# Singleton client instance
_kong_client: Optional[KongClient] = None


def get_kong_client() -> KongClient:
    """Get or create Kong client singleton."""
    global _kong_client
    if _kong_client is None:
        _kong_client = KongClient()
    return _kong_client

