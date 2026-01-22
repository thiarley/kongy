"""
In-Memory Storage Implementation

This implementation stores all data in memory. Data is lost when the
application restarts. This is intentional for the initial version as
per requirements (no database, setup required after restart).

The abstract interface allows easy migration to a database in the future.
"""

from typing import Optional, Dict, Any
from passlib.context import CryptContext

from app.storage.interface import StorageInterface


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class MemoryStorage(StorageInterface):
    """
    In-memory storage implementation.
    
    WARNING: All data is lost on application restart.
    This is the intended behavior for the initial version.
    """
    
    def __init__(self):
        self._users: Dict[str, Dict[str, Any]] = {}
        self._kong_connections: Dict[str, Dict[str, Any]] = {}
    
    # ==================== User Operations ====================
    
    async def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        return self._users.get(username)
    
    async def create_user(self, username: str, password_hash: str, role: str = "admin") -> Dict[str, Any]:
        """Create a new user."""
        user = {
            "username": username,
            "password_hash": password_hash,
            "role": role
        }
        self._users[username] = user
        return user
    
    async def update_user(self, username: str, data: Dict[str, Any]) -> bool:
        """Update user data."""
        if username not in self._users:
            return False
        
        # Don't allow changing username
        data.pop("username", None)
        self._users[username].update(data)
        return True
    
    async def delete_user(self, username: str) -> bool:
        """Delete a user."""
        if username not in self._users:
            return False
        
        del self._users[username]
        # Also delete associated Kong connection
        self._kong_connections.pop(username, None)
        return True
    
    async def count_users(self) -> int:
        """Count total users."""
        return len(self._users)
    
    # ==================== Kong Connection Operations ====================
    
    async def save_kong_connection(self, user_id: str, connection: Dict[str, Any]) -> bool:
        """Save Kong connection settings for a user."""
        self._kong_connections[user_id] = connection
        return True
    
    async def get_kong_connection(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get Kong connection settings for a user."""
        return self._kong_connections.get(user_id)
    
    async def delete_kong_connection(self, user_id: str) -> bool:
        """Delete Kong connection settings."""
        if user_id not in self._kong_connections:
            return False
        
        del self._kong_connections[user_id]
        return True
    
    # ==================== Utility Methods ====================
    
    def clear_all(self) -> None:
        """Clear all data. Useful for testing."""
        self._users.clear()
        self._kong_connections.clear()


# Singleton storage instance
storage = MemoryStorage()


def get_storage() -> MemoryStorage:
    """Get the storage singleton instance."""
    return storage
