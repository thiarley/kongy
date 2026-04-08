# Kongy 🦍

**Kong Gateway Manager** - Open source visual interface for managing routes, services, plugins, and consumers in Kong Gateway.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![Kong](https://img.shields.io/badge/Kong-3.x-green.svg)](https://konghq.com/)

> [!NOTE]
> Leia em Português: [README.pt-BR.md](README.pt-BR.md)

---

## ✨ Features

- 🔐 **Self-contained Authentication** - JWT with initial setup, no external service dependencies
- 🌍 **Internationalization** - Support for Portuguese (BR) and English (US) with automatic detection
- 🛡️ **Security** - Rate limiting, security headers, brute-force protection
- 📦 **Docker Ready** - Ready for deployment with Docker Compose
- 🧪 **Kong Local** - Development environment with integrated Kong
- 🔌 **Plugin Management** - Apply plugins to routes, services, and consumers
- 📤 **Import/Export** - Export and import route configurations
- ⚡ **Vite + TypeScript** - Modern frontend with Hot Module Replacement

---

## 📸 Screenshots

<p align="center">
  <img src="screenshots/setup.png" width="400" alt="Initial Setup">
  <img src="screenshots/services.png" width="400" alt="Services View">
  <img src="screenshots/routes.png" width="400" alt="Routes View">
  <img src="screenshots/plugins.png" width="400" alt="Plugin Management">
</p>

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/kongy.git
cd kongy

# Copy the environment file
cp .env.example .env

# Start all services (Kong + Kongy)
docker compose up -d

# Access http://localhost:8081
```

On first access, you will be redirected to create the administrator user.

### Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:8081` with HMR.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kongy Container                         │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │   Frontend (Vite)   │───▶│  Backend (FastAPI)         │  │
│  │   :8081             │    │  :8000                     │  │
│  │   TypeScript/HTML   │    │  - Auth (JWT)              │  │
│  └─────────────────────┘    │  - Kong Proxy              │  │
│                              │  - Rate Limiting           │  │
│                              └──────────┬─────────────────┘  │
│                                         │                    │
│                                         ▼                    │
│                               ┌─────────────────────┐       │
│                               │   Kong Admin API    │       │
│                               │   :8001 (internal)  │       │
│                               └─────────────────────┘       │
└─────────────────────────────────────────┼───────────────────┘
```

---

## 📁 Project Structure

```
kongy/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── auth/         # JWT authentication
│   │   ├── kong/         # Kong Admin API proxy
│   │   ├── storage/      # In-memory storage
│   │   └── middleware/   # Security, rate limiting
│   └── tests/            # Pytest tests
├── frontend/             # Vite + TypeScript frontend
│   ├── src/
│   │   ├── services/     # API, Auth, i18n
│   │   ├── types/        # TypeScript interfaces
│   │   ├── utils/        # Helpers, constants
│   │   ├── app.ts        # Main application
│   │   ├── ui.ts         # UI rendering
│   │   └── store.ts      # State management
│   ├── locales/          # Translations
│   └── vite.config.ts    # Vite configuration
├── docker-compose.yml    # Dev environment (with Kong)
├── docker-compose.prod.yml # Production (external Kong)
└── .env.example          # Environment template
```

---

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key | `change-me...` |
| `KONG_ADMIN_URL` | Kong Admin API URL | `http://kong:8001` |
| `DEBUG` | Enable debug mode | `false` |
| `JWT_EXPIRE_MINUTES` | Token expiration | `60` |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:8081"]` |

See `.env.example` for all options.

`KONG_ADMIN_URL` is the initial Kong Admin API URL on each application startup. If initial setup provides a different URL, that override only lives in memory until the next restart.

---

## 🔒 Security

> ⚠️ **Important**: Data is stored in memory and lost upon restart.
> Configure the admin user at every startup.

- JWT Authentication
- Rate Limiting (configurable)
- Brute-force protection
- Security Headers (CSP, X-Frame-Options, etc.)
- Non-root containers

---

## 🧪 Testing

```bash
# Backend
cd backend
pip install -r requirements-dev.txt
pytest --cov=app

# Frontend Build
cd frontend
npm run build
```

On the routes screen, the actions bar includes a button to download a `routes-import-example.json` file with a valid import example.

The import flow now shows a summary before execution and a result modal afterwards with successes and failures per route/plugin. Route import always uses the currently selected service in the UI, and exported route JSON does not include `service.id`.

---

## 🐳 Docker Production

### Build and Deploy

```bash
# Production Build
docker compose -f docker-compose.prod.yml build

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

For container registry publishing, the frontend Dockerfile now builds the production Nginx image by default:

```bash
docker build \
  --provenance=false \
  --build-arg NPM_REGISTRY=https://nexus.example/repository/npm-group/ \
  -t kongy-frontend:1.0.0 \
  frontend
```

Use `--target dev` only when you explicitly want the Vite development image.

### Kubernetes

Deployment example available in `k8s/` (coming soon).

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 License

MIT License - see [LICENSE](LICENSE).

---

Made with ❤️ by the community
