"""
Storage Tests

Note: These tests focus on storage functionality, not password hashing.
Password hashing is tested in auth tests.
"""

import pytest

from app.storage.memory import MemoryStorage


class TestMemoryStorage:
    """Tests for in-memory storage."""
    
    @pytest.fixture
    def storage(self):
        """Get fresh storage instance for each test."""
        s = MemoryStorage()
        yield s
        s.clear_all()

    @pytest.mark.asyncio
    async def test_create_user(self, storage):
        """Should create user with all fields."""
        # Use simple hash string for testing storage (not actual password hashing)
        password_hash = "hashed_password_for_test"
        user = await storage.create_user("testuser", password_hash, "admin")
        
        assert user["username"] == "testuser"
        assert user["password_hash"] == password_hash
        assert user["role"] == "admin"

    @pytest.mark.asyncio
    async def test_get_user(self, storage):
        """Should retrieve created user."""
        password_hash = "hashed_password_for_test"
        await storage.create_user("testuser", password_hash)
        
        user = await storage.get_user("testuser")
        
        assert user is not None
        assert user["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_get_nonexistent_user(self, storage):
        """Should return None for non-existent user."""
        user = await storage.get_user("nobody")
        
        assert user is None

    @pytest.mark.asyncio
    async def test_update_user(self, storage):
        """Should update user data."""
        await storage.create_user("testuser", "hash", "admin")
        
        result = await storage.update_user("testuser", {"role": "viewer"})
        
        assert result is True
        user = await storage.get_user("testuser")
        assert user["role"] == "viewer"

    @pytest.mark.asyncio
    async def test_update_nonexistent_user(self, storage):
        """Should return False for non-existent user."""
        result = await storage.update_user("nobody", {"role": "viewer"})
        
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_user(self, storage):
        """Should delete user."""
        await storage.create_user("testuser", "hash")
        
        result = await storage.delete_user("testuser")
        
        assert result is True
        user = await storage.get_user("testuser")
        assert user is None

    @pytest.mark.asyncio
    async def test_count_users(self, storage):
        """Should count users correctly."""
        assert await storage.count_users() == 0
        
        await storage.create_user("user1", "hash1")
        assert await storage.count_users() == 1
        
        await storage.create_user("user2", "hash2")
        assert await storage.count_users() == 2
        
        await storage.delete_user("user1")
        assert await storage.count_users() == 1

    @pytest.mark.asyncio
    async def test_kong_connection(self, storage):
        """Should save and retrieve Kong connection."""
        conn = {"url": "http://kong:8001", "verified": True}
        
        result = await storage.save_kong_connection("user1", conn)
        assert result is True
        
        retrieved = await storage.get_kong_connection("user1")
        assert retrieved == conn

    @pytest.mark.asyncio
    async def test_delete_kong_connection(self, storage):
        """Should delete Kong connection."""
        await storage.save_kong_connection("user1", {"url": "http://kong:8001"})
        
        result = await storage.delete_kong_connection("user1")
        assert result is True
        
        retrieved = await storage.get_kong_connection("user1")
        assert retrieved is None

    @pytest.mark.asyncio
    async def test_delete_user_removes_connection(self, storage):
        """Deleting user should also delete their Kong connection."""
        await storage.create_user("testuser", "hash")
        await storage.save_kong_connection("testuser", {"url": "http://kong:8001"})
        
        await storage.delete_user("testuser")
        
        conn = await storage.get_kong_connection("testuser")
        assert conn is None

    def test_clear_all(self, storage):
        """Should clear all data."""
        import asyncio
        
        async def setup():
            await storage.create_user("user1", "hash1")
            await storage.save_kong_connection("user1", {"url": "test"})
        
        asyncio.get_event_loop().run_until_complete(setup())
        
        storage.clear_all()
        
        async def verify():
            assert await storage.count_users() == 0
            assert await storage.get_kong_connection("user1") is None
        
        asyncio.get_event_loop().run_until_complete(verify())
