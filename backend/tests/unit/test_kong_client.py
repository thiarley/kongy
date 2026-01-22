"""
Kong Client Unit Tests

Tests for the Kong Admin API client.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app.kong.client import KongClient, get_kong_client


class TestKongClientInit:
    """Tests for KongClient initialization."""
    
    def test_default_init(self):
        """Client should use settings URL by default."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_ADMIN_URL = "http://kong:8001/"
            mock_settings.KONG_TIMEOUT = 30
            
            client = KongClient()
            
            assert client.base_url == "http://kong:8001"  # Trailing slash stripped
            assert client.timeout == 30
    
    def test_custom_url(self):
        """Client should accept custom base URL."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_TIMEOUT = 30
            
            client = KongClient(base_url="http://custom:8001/")
            
            assert client.base_url == "http://custom:8001"
    
    def test_configure(self):
        """Configure should update base URL."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_ADMIN_URL = "http://kong:8001"
            mock_settings.KONG_TIMEOUT = 30
            
            client = KongClient()
            client.configure("http://new:8001/")
            
            assert client.base_url == "http://new:8001"


class TestKongClientRequest:
    """Tests for KongClient request method."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_ADMIN_URL = "http://kong:8001"
            mock_settings.KONG_TIMEOUT = 30
            return KongClient()
    
    @pytest.mark.asyncio
    async def test_get_request_success(self, client):
        """GET request should return JSON response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'{"data": []}'
        mock_response.json.return_value = {"data": []}
        
        with patch.object(httpx.AsyncClient, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await client.request("GET", "/services")
            
            assert result == {"data": []}
            mock_request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_post_request_success(self, client):
        """POST request should send body and return response."""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.content = b'{"id": "123", "name": "test"}'
        mock_response.json.return_value = {"id": "123", "name": "test"}
        
        with patch.object(httpx.AsyncClient, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await client.request("POST", "/services", body={"name": "test"})
            
            assert result["id"] == "123"
            assert result["name"] == "test"
    
    @pytest.mark.asyncio
    async def test_delete_request_204(self, client):
        """DELETE request with 204 should return status."""
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_response.content = b''
        
        with patch.object(httpx.AsyncClient, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await client.request("DELETE", "/services/123")
            
            assert result["status"] == 204
    
    @pytest.mark.asyncio
    async def test_error_response(self, client):
        """Error response should return error dict."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.content = b'{"message": "Not found"}'
        mock_response.json.return_value = {"message": "Not found"}
        
        with patch.object(httpx.AsyncClient, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await client.request("GET", "/services/nonexistent")
            
            assert result["error"] is True
            assert result["status"] == 404
            assert result["details"]["message"] == "Not found"
    
    @pytest.mark.asyncio
    async def test_connection_error(self, client):
        """Connection error should return 502 error."""
        with patch.object(httpx.AsyncClient, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.side_effect = httpx.RequestError("Connection failed")
            
            result = await client.request("GET", "/services")
            
            assert result["error"] is True
            assert result["status"] == 502
            assert "unavailable" in result["details"]["message"]
    
    @pytest.mark.asyncio
    async def test_path_without_slash(self, client):
        """Path without leading slash should be normalized."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b'{}'
        mock_response.json.return_value = {}
        
        with patch.object(httpx.AsyncClient, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            await client.request("GET", "services")  # No leading slash
            
            # Verify URL was constructed correctly
            call_args = mock_request.call_args
            assert "/services" in str(call_args)


class TestKongClientConvenienceMethods:
    """Tests for KongClient convenience methods."""
    
    @pytest.fixture
    def client(self):
        """Create test client with mocked request."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_ADMIN_URL = "http://kong:8001"
            mock_settings.KONG_TIMEOUT = 30
            return KongClient()
    
    # ==================== Status ====================
    
    @pytest.mark.asyncio
    async def test_get_status(self, client):
        """get_status should call GET /."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"version": "3.0"}
            
            result = await client.get_status()
            
            mock_request.assert_called_once_with("GET", "/")
            assert result["version"] == "3.0"
    
    # ==================== Services ====================
    
    @pytest.mark.asyncio
    async def test_get_services(self, client):
        """get_services should call GET /services."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_services()
            
            mock_request.assert_called_once_with("GET", "/services", params={})
    
    @pytest.mark.asyncio
    async def test_get_service(self, client):
        """get_service should call GET /services/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.get_service("my-service")
            
            mock_request.assert_called_once_with("GET", "/services/my-service")
    
    @pytest.mark.asyncio
    async def test_create_service(self, client):
        """create_service should call POST /services."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123", "name": "test"}
            
            await client.create_service({"name": "test", "url": "http://example.com"})
            
            mock_request.assert_called_once_with(
                "POST", "/services", 
                body={"name": "test", "url": "http://example.com"}
            )
    
    @pytest.mark.asyncio
    async def test_update_service(self, client):
        """update_service should call PATCH /services/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.update_service("my-service", {"url": "http://new.com"})
            
            mock_request.assert_called_once_with(
                "PATCH", "/services/my-service", 
                body={"url": "http://new.com"}
            )
    
    @pytest.mark.asyncio
    async def test_delete_service(self, client):
        """delete_service should call DELETE /services/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"status": 204}
            
            await client.delete_service("my-service")
            
            mock_request.assert_called_once_with("DELETE", "/services/my-service")
    
    # ==================== Routes ====================
    
    @pytest.mark.asyncio
    async def test_get_routes(self, client):
        """get_routes should call GET /routes."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_routes()
            
            mock_request.assert_called_once_with("GET", "/routes", params={})
    
    @pytest.mark.asyncio
    async def test_create_route(self, client):
        """create_route should call POST /routes."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_route({"paths": ["/api"], "service": {"id": "svc-123"}})
            
            mock_request.assert_called_once_with(
                "POST", "/routes", 
                body={"paths": ["/api"], "service": {"id": "svc-123"}}
            )
    
    @pytest.mark.asyncio
    async def test_delete_route(self, client):
        """delete_route should call DELETE /routes/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"status": 204}
            
            await client.delete_route("route-123")
            
            mock_request.assert_called_once_with("DELETE", "/routes/route-123")
    
    @pytest.mark.asyncio
    async def test_get_service_routes(self, client):
        """get_service_routes should call GET /services/{id}/routes."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_service_routes("my-service")
            
            mock_request.assert_called_once_with(
                "GET", "/services/my-service/routes", 
                params={}
            )
    
    # ==================== Plugins ====================
    
    @pytest.mark.asyncio
    async def test_get_plugins(self, client):
        """get_plugins should call GET /plugins."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_plugins()
            
            mock_request.assert_called_once_with("GET", "/plugins", params={})
    
    @pytest.mark.asyncio
    async def test_create_plugin(self, client):
        """create_plugin should call POST /plugins."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_plugin({"name": "rate-limiting", "config": {}})
            
            mock_request.assert_called_once_with(
                "POST", "/plugins", 
                body={"name": "rate-limiting", "config": {}}
            )
    
    @pytest.mark.asyncio
    async def test_delete_plugin(self, client):
        """delete_plugin should call DELETE /plugins/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"status": 204}
            
            await client.delete_plugin("plugin-123")
            
            mock_request.assert_called_once_with("DELETE", "/plugins/plugin-123")
    
    # ==================== Consumers ====================
    
    @pytest.mark.asyncio
    async def test_get_consumers(self, client):
        """get_consumers should call GET /consumers."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_consumers()
            
            mock_request.assert_called_once_with("GET", "/consumers", params={})
    
    @pytest.mark.asyncio
    async def test_create_consumer(self, client):
        """create_consumer should call POST /consumers."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_consumer({"username": "test-user"})
            
            mock_request.assert_called_once_with(
                "POST", "/consumers", 
                body={"username": "test-user"}
            )
    
    @pytest.mark.asyncio
    async def test_delete_consumer(self, client):
        """delete_consumer should call DELETE /consumers/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"status": 204}
            
            await client.delete_consumer("test-user")
            
            mock_request.assert_called_once_with("DELETE", "/consumers/test-user")
    
    # ==================== Upstreams ====================
    
    @pytest.mark.asyncio
    async def test_get_upstreams(self, client):
        """get_upstreams should call GET /upstreams."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_upstreams()
            
            mock_request.assert_called_once_with("GET", "/upstreams", params={})
    
    @pytest.mark.asyncio
    async def test_create_upstream(self, client):
        """create_upstream should call POST /upstreams."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_upstream({"name": "my-upstream"})
            
            mock_request.assert_called_once_with(
                "POST", "/upstreams", 
                body={"name": "my-upstream"}
            )
    
    # ==================== Targets ====================
    
    @pytest.mark.asyncio
    async def test_get_targets(self, client):
        """get_targets should call GET /upstreams/{id}/targets."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_targets("upstream-123")
            
            mock_request.assert_called_once_with(
                "GET", "/upstreams/upstream-123/targets", 
                params={}
            )
    
    @pytest.mark.asyncio
    async def test_create_target(self, client):
        """create_target should call POST /upstreams/{id}/targets."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_target("upstream-123", {"target": "localhost:8000"})
            
            mock_request.assert_called_once_with(
                "POST", "/upstreams/upstream-123/targets", 
                body={"target": "localhost:8000"}
            )
    
    @pytest.mark.asyncio
    async def test_delete_target(self, client):
        """delete_target should call DELETE /upstreams/{id}/targets/{id}."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"status": 204}
            
            await client.delete_target("upstream-123", "target-456")
            
            mock_request.assert_called_once_with(
                "DELETE", "/upstreams/upstream-123/targets/target-456"
            )
    
    # ==================== Certificates ====================
    
    @pytest.mark.asyncio
    async def test_get_certificates(self, client):
        """get_certificates should call GET /certificates."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_certificates()
            
            mock_request.assert_called_once_with("GET", "/certificates", params={})
    
    @pytest.mark.asyncio
    async def test_create_certificate(self, client):
        """create_certificate should call POST /certificates."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_certificate({"cert": "...", "key": "..."})
            
            mock_request.assert_called_once_with(
                "POST", "/certificates", 
                body={"cert": "...", "key": "..."}
            )
    
    # ==================== SNIs ====================
    
    @pytest.mark.asyncio
    async def test_get_snis(self, client):
        """get_snis should call GET /snis."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_snis()
            
            mock_request.assert_called_once_with("GET", "/snis", params={})
    
    @pytest.mark.asyncio
    async def test_create_sni(self, client):
        """create_sni should call POST /snis."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_sni({"name": "example.com", "certificate": {"id": "cert-123"}})
            
            mock_request.assert_called_once_with(
                "POST", "/snis", 
                body={"name": "example.com", "certificate": {"id": "cert-123"}}
            )
    
    # ==================== CA Certificates ====================
    
    @pytest.mark.asyncio
    async def test_get_ca_certificates(self, client):
        """get_ca_certificates should call GET /ca_certificates."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"data": []}
            
            await client.get_ca_certificates()
            
            mock_request.assert_called_once_with("GET", "/ca_certificates", params={})
    
    @pytest.mark.asyncio
    async def test_create_ca_certificate(self, client):
        """create_ca_certificate should call POST /ca_certificates."""
        with patch.object(client, 'request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"id": "123"}
            
            await client.create_ca_certificate({"cert": "..."})
            
            mock_request.assert_called_once_with(
                "POST", "/ca_certificates", 
                body={"cert": "..."}
            )


class TestGetKongClient:
    """Tests for get_kong_client singleton."""
    
    def test_returns_client_instance(self):
        """get_kong_client should return a KongClient instance."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_ADMIN_URL = "http://kong:8001"
            mock_settings.KONG_TIMEOUT = 30
            
            # Reset singleton
            import app.kong.client as client_module
            client_module._kong_client = None
            
            client = get_kong_client()
            
            assert isinstance(client, KongClient)
    
    def test_returns_same_instance(self):
        """get_kong_client should return the same instance."""
        with patch('app.kong.client.settings') as mock_settings:
            mock_settings.KONG_ADMIN_URL = "http://kong:8001"
            mock_settings.KONG_TIMEOUT = 30
            
            # Reset singleton
            import app.kong.client as client_module
            client_module._kong_client = None
            
            client1 = get_kong_client()
            client2 = get_kong_client()
            
            assert client1 is client2
