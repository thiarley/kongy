"""
Integration tests using Testcontainers with Kong.

These tests spin up a real Kong instance using Docker and test
our API against it.
"""
import pytest
from testcontainers.postgres import PostgresContainer
from testcontainers.core.container import DockerContainer
from testcontainers.core.waiting_utils import wait_for_logs
import time
import httpx


class KongContainer(DockerContainer):
    """Custom container for Kong Gateway."""
    
    def __init__(self, postgres_host: str, postgres_port: int):
        super().__init__("kong:3.5")
        self.with_env("KONG_DATABASE", "postgres")
        self.with_env("KONG_PG_HOST", postgres_host)
        self.with_env("KONG_PG_PORT", str(postgres_port))
        self.with_env("KONG_PG_USER", "postgres")
        self.with_env("KONG_PG_PASSWORD", "postgres")
        self.with_env("KONG_PG_DATABASE", "kong")
        self.with_env("KONG_ADMIN_LISTEN", "0.0.0.0:8001")
        self.with_env("KONG_PROXY_LISTEN", "0.0.0.0:8000")
        self.with_exposed_ports(8001, 8000)
    
    def get_admin_url(self) -> str:
        """Get the Admin API URL."""
        host = self.get_container_host_ip()
        port = self.get_exposed_port(8001)
        return f"http://{host}:{port}"


@pytest.fixture(scope="module")
def postgres_container():
    """Start PostgreSQL container for Kong."""
    with PostgresContainer(
        image="postgres:15-alpine",
        username="postgres",
        password="postgres",
        dbname="kong"
    ) as postgres:
        yield postgres


@pytest.fixture(scope="module")
def kong_container(postgres_container):
    """Start Kong container after PostgreSQL is ready."""
    # Get PostgreSQL connection info
    postgres_host = postgres_container.get_container_host_ip()
    postgres_port = int(postgres_container.get_exposed_port(5432))
    
    # Run Kong migrations first
    migrations = DockerContainer("kong:3.5")
    migrations.with_env("KONG_DATABASE", "postgres")
    migrations.with_env("KONG_PG_HOST", postgres_host)
    migrations.with_env("KONG_PG_PORT", str(postgres_port))
    migrations.with_env("KONG_PG_USER", "postgres")
    migrations.with_env("KONG_PG_PASSWORD", "postgres")
    migrations.with_env("KONG_PG_DATABASE", "kong")
    migrations.with_command("kong migrations bootstrap")
    
    with migrations:
        # Wait for migrations to complete
        wait_for_logs(migrations, "Database is up-to-date", timeout=60)
    
    # Now start Kong
    kong = KongContainer(postgres_host, postgres_port)
    kong.start()
    
    # Wait for Kong to be healthy
    admin_url = kong.get_admin_url()
    max_retries = 30
    for i in range(max_retries):
        try:
            response = httpx.get(f"{admin_url}/status", timeout=5)
            if response.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(2)
    else:
        raise RuntimeError("Kong failed to start")
    
    yield kong
    kong.stop()


@pytest.mark.integration
class TestKongIntegration:
    """Integration tests against real Kong instance."""
    
    def test_kong_is_healthy(self, kong_container):
        """Test that Kong is running and healthy."""
        admin_url = kong_container.get_admin_url()
        response = httpx.get(f"{admin_url}/status")
        assert response.status_code == 200
    
    def test_create_service(self, kong_container):
        """Test creating a service in Kong."""
        admin_url = kong_container.get_admin_url()
        
        # Create service
        response = httpx.post(
            f"{admin_url}/services",
            json={
                "name": "test-service",
                "url": "http://httpbin.org"
            }
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "test-service"
        assert "id" in data
        
        # Cleanup
        httpx.delete(f"{admin_url}/services/{data['id']}")
    
    def test_create_route(self, kong_container):
        """Test creating a route in Kong."""
        admin_url = kong_container.get_admin_url()
        
        # First create a service
        svc_response = httpx.post(
            f"{admin_url}/services",
            json={
                "name": "route-test-service",
                "url": "http://httpbin.org"
            }
        )
        service_id = svc_response.json()["id"]
        
        # Create route
        route_response = httpx.post(
            f"{admin_url}/routes",
            json={
                "name": "test-route",
                "paths": ["/test"],
                "service": {"id": service_id}
            }
        )
        assert route_response.status_code == 201
        
        route_data = route_response.json()
        assert route_data["name"] == "test-route"
        
        # Cleanup
        httpx.delete(f"{admin_url}/routes/{route_data['id']}")
        httpx.delete(f"{admin_url}/services/{service_id}")
    
    def test_create_plugin(self, kong_container):
        """Test creating a plugin in Kong."""
        admin_url = kong_container.get_admin_url()
        
        # Create global plugin
        response = httpx.post(
            f"{admin_url}/plugins",
            json={
                "name": "cors",
                "config": {
                    "origins": ["*"],
                    "methods": ["GET", "POST"]
                }
            }
        )
        assert response.status_code == 201
        
        plugin_data = response.json()
        assert plugin_data["name"] == "cors"
        
        # Cleanup
        httpx.delete(f"{admin_url}/plugins/{plugin_data['id']}")
    
    def test_create_consumer(self, kong_container):
        """Test creating a consumer in Kong."""
        admin_url = kong_container.get_admin_url()
        
        response = httpx.post(
            f"{admin_url}/consumers",
            json={
                "username": "test-consumer"
            }
        )
        assert response.status_code == 201
        
        consumer_data = response.json()
        assert consumer_data["username"] == "test-consumer"
        
        # Cleanup
        httpx.delete(f"{admin_url}/consumers/{consumer_data['id']}")
