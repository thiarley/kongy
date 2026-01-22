# Kongy Backend

FastAPI backend for Kongy - Kong Gateway Manager.

## Development

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Testing

```bash
pip install -r requirements-dev.txt
python3 -m pytest tests/ -v
```

## Kong Admin API Coverage

The `KongClient` provides complete CRUD operations for major Kong entities:

| Entity | List | Get | Create | Update | Delete |
|--------|------|-----|--------|--------|--------|
| Services | ✅ | ✅ | ✅ | ✅ | ✅ |
| Routes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Plugins | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consumers | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upstreams | ✅ | ✅ | ✅ | ✅ | ✅ |
| Targets | ✅ | - | ✅ | - | ✅ |
| Certificates | ✅ | ✅ | ✅ | ✅ | ✅ |
| SNIs | ✅ | ✅ | ✅ | - | ✅ |
| CA Certificates | ✅ | ✅ | ✅ | - | ✅ |

Additional methods:
- `get_status()` - Kong node info
- `get_enabled_plugins()` - List enabled plugins
- `get_plugin_schema(name)` - Plugin configuration schema
- `get_service_routes(id)` - Routes for a specific service

## Project Structure

```
backend/
├── app/
│   ├── auth/         # JWT authentication
│   ├── kong/         # Kong Admin API client & proxy
│   │   ├── client.py # KongClient with CRUD methods
│   │   └── router.py # FastAPI proxy router
│   ├── middleware/   # Security, rate limiting
│   └── storage/      # In-memory storage
├── tests/
│   ├── unit/         # Unit tests
│   │   ├── test_kong_client.py  # 38 tests for Kong client
│   │   ├── test_auth.py
│   │   └── ...
│   └── conftest.py   # Pytest fixtures
└── requirements.txt
```
