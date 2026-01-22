"""
Storage Interface - Abstract Base Class

This interface allows easy migration from in-memory storage to a database
in the future without changing the rest of the application.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class StorageInterface(ABC):
    """Abstract interface for persistent storage."""
    
    # ==================== User Operations ====================
    
    @abstractmethod
    async def get_user(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user by username.
        
        Args:
            username: The username to look up
            
        Returns:
            User dict with keys: username, password_hash, role
            None if user not found
        """
        pass
    
    @abstractmethod
    async def create_user(self, username: str, password_hash: str, role: str = "admin") -> Dict[str, Any]:
        """
        Create a new user.
        
        Args:
            username: Unique username
            password_hash: Bcrypt hashed password
            role: User role (admin, viewer)
            
        Returns:
            Created user dict
        """
        pass
    
    @abstractmethod
    async def update_user(self, username: str, data: Dict[str, Any]) -> bool:
        """
        Update user data.
        
        Args:
            username: Username to update
            data: Dict of fields to update
            
        Returns:
            True if updated, False if user not found
        """
        pass
    
    @abstractmethod
    async def delete_user(self, username: str) -> bool:
        """
        Delete a user.
        
        Args:
            username: Username to delete
            
        Returns:
            True if deleted, False if user not found
        """
        pass
    
    @abstractmethod
    async def count_users(self) -> int:
        """
        Count total users.
        
        Returns:
            Number of users in storage
        """
        pass
    
    # ==================== Kong Connection Operations ====================
    
    @abstractmethod
    async def save_kong_connection(self, user_id: str, connection: Dict[str, Any]) -> bool:
        """
        Save Kong connection settings for a user.
        
        Args:
            user_id: User identifier
            connection: Dict with Kong connection info (url, verified, etc)
            
        Returns:
            True if saved successfully
        """
        pass
    
    @abstractmethod
    async def get_kong_connection(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get Kong connection settings for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Connection dict or None if not found
        """
        pass
    
    @abstractmethod
    async def delete_kong_connection(self, user_id: str) -> bool:
        """
        Delete Kong connection settings.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if deleted, False if not found
        """
        pass
