import os
import json
from pathlib import Path
from unittest.mock import patch, mock_open
from app.config import _get_version


def test_get_version_from_env():
    """Test version resolved from VERSION env var."""
    with patch.dict(os.environ, {"VERSION": "2.3.4"}):
        assert _get_version() == "2.3.4"


def test_get_version_from_file():
    """Test version resolved from version.txt inside app directory."""
    with patch.dict(os.environ, {}, clear=True):
        with patch.object(Path, "exists", return_value=True):
            with patch.object(Path, "read_text", return_value="1.5.0\n"):
                assert _get_version() == "1.5.0"


def test_get_version_from_package_json():
    """Test version resolved from frontend package.json."""
    mock_data = json.dumps({"version": "1.2.3"})
    with patch.dict(os.environ, {}, clear=True):
        # First exists check (version.txt) returns False
        # Second exists check (package.json) returns True
        def mock_exists(self):
            return "package.json" in str(self)

        with patch.object(Path, "exists", mock_exists):
            with patch("builtins.open", mock_open(read_data=mock_data)):
                assert _get_version() == "1.2.3"


def test_get_version_fallback():
    """Test fallback when no environment variable or files exist."""
    with patch.dict(os.environ, {}, clear=True):
        with patch.object(Path, "exists", return_value=False):
            assert _get_version() == "1.0.0-dev"
