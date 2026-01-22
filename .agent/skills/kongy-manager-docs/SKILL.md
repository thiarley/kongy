---
name: kongy-manager-docs
description: Provides context and documentation for the Konga Manager application (Vite/TypeScript + FastAPI). Use this skill to understand the architecture, API endpoints, data structures, and best practices.
---

# Kongy Manager Documentation Skill

Comprehensive documentation for the Konga Manager application - open source visual interface for Kong Gateway management.

## When to use this skill

- **Understanding Architecture**: When you need to understand how the frontend talks to the backend and Kong Gateway.
- **API Integration**: When implementing new features that consume the CRUD API.
- **Debugging**: When fixing issues related to data flow or type mismatches.
- **Reference**: When looking up Kong entity structures (Service, Route, Plugin, etc.).

## How to use it

### 1. Architecture Reference

Understand the flow before making changes:
`Frontend (Vite + TypeScript) → Backend (FastAPI) → Kong Admin API → Kong Gateway`

### 2. Frontend Structure

Locate files in the modular structure:

```
frontend/src/
├── app.ts             # Main Controller (View Orchestration)
├── services/          # Core Logic
│   ├── api.ts         # API Client (Singleton)
│   ├── auth.ts        # Authentication
│   └── i18n.ts        # Localization
├── views/             # View Modules (DOM & Interaction)
│   ├── DashboardView.ts
│   ├── ServicesView.ts
│   ├── RoutesView.ts
│   ├── ConsumersView.ts
│   ├── PluginsView.ts
│   └── ...
├── store.ts           # State Management
└── types/             # TS Interfaces
```

### 3. API Usage

Use the `api` singleton from `@/services/api`:

```typescript
import { api } from './services/api';

// Services
const services = await api.getServices();
await api.createService({ name: 'my-service', host: 'api.ex.com', port: 80 });

// Routes
const routes = await api.getRoutes();
await api.saveRoute({ name: 'my-route', paths: ['/api'] });

// Plugins (Route/Service/Consumer)
await api.createPlugin({ name: 'rate-limiting', service: { id: svcId }, config: { minute: 5 }});
```

### 4. Best Practices

- **Type Safety**: Always use interfaces from `src/types/kong.ts` (e.g., `Service`, `Route`, `Plugin`).
- **State Updates**: Mutate state via `store` methods (`store.setRoutes(...)`) to trigger UI reactivity.
- **Error Handling**: Catch errors in View handlers and use `showToast()` for feedback.

### 5. API Reference (Short)

| Resource | Endpoints | Notes |
|----------|-----------|-------|
| Services | `/kong/services` | Base entity |
| Routes | `/kong/routes` | Linked to Services |
| Plugins | `/kong/plugins` | Global or scoped |
| Consumers| `/kong/consumers`| Auth entities |
