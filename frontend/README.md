# Kongy Frontend 🦍

Frontend moderno do Kongy Manager construído com **Vite** e **TypeScript**.

## 🛠️ Tech Stack

- **Vite 5.x** - Build tool e dev server com HMR
- **TypeScript 5.x** - Tipagem estática
- **Vanilla JS/TS** - Sem frameworks (React/Vue/Angular)
- **SweetAlert2** - Modais e confirmações
- **Toastify** - Notificações toast

## 📁 Estrutura

```
frontend/
├── src/
│   ├── services/         # Camada de serviços
│   │   ├── api.ts        # Cliente Kong API
│   │   ├── auth.ts       # Autenticação JWT
│   │   └── i18n.ts       # Internacionalização
│   ├── types/            # TypeScript interfaces
│   │   └── kong.ts       # Tipagens das entidades Kong
│   ├── utils/            # Utilitários
│   │   ├── constants.ts  # Constantes globais
│   │   └── index.ts      # Funções helper
│   ├── app.ts            # Aplicação principal
│   ├── ui.ts             # Renderização de UI
│   ├── store.ts          # Estado global (Observer Pattern)
│   ├── login.ts          # Página de login
│   ├── main.ts           # Entry point
│   └── style.css         # Estilos
├── locales/              # Traduções (pt-BR, en-US)
├── index.html            # Página principal
├── login.html            # Página de login
├── vite.config.ts        # Configuração Vite
├── tsconfig.json         # Configuração TypeScript
└── package.json
```

## 🚀 Desenvolvimento

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn

### Instalação

```bash
npm install
```

### Dev Server

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:8081` com Hot Module Replacement.

### Build de Produção

```bash
npm run build
```

Os arquivos serão gerados em `dist/`.

### Preview do Build

```bash
npm run preview
```

## ⚙️ Configuração Vite

O `vite.config.ts` configura:

- **Proxy**: Redireciona `/api` para o backend (`http://backend:8000`)
- **Multi-page**: Suporta `index.html` e `login.html`
- **HMR**: Hot Module Replacement para desenvolvimento ágil

```typescript
export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 8081,
        proxy: {
            '/api': {
                target: process.env.BACKEND_URL || 'http://backend:8000',
                changeOrigin: true
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                login: 'login.html'
            }
        }
    }
})
```

## 🐳 Docker

### Desenvolvimento

```dockerfile
FROM node:18-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
CMD ["npm", "run", "dev", "--", "--host"]
```

### Produção

O Dockerfile usa multi-stage build:

1. **Builder**: Compila TypeScript e gera bundle
2. **Production**: Nginx servindo arquivos estáticos

```bash
# Build
docker build -t kongy-frontend .

# Run
docker run -p 8080:80 kongy-frontend
```

## 📦 Dependências

### Produção

- `sweetalert2` - Modais elegantes

### Desenvolvimento

- `typescript` - Compilador TypeScript
- `vite` - Build tool
- `@types/node` - Tipagens Node.js

## 🔧 Scripts npm

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila TypeScript e gera bundle |
| `npm run preview` | Preview do build de produção |

## 🌍 Internacionalização

Locales disponíveis em `locales/`:

- `pt-BR.json` - Português (Brasil)
- `en-US.json` - English (US)

O i18n detecta automaticamente o idioma do navegador.

## 📝 Convenções de Código

- **Tipagem forte**: Use interfaces para todas as entidades
- **Async/await**: Evite callbacks e `.then()`
- **Null checks**: Sempre verifique elementos DOM antes de usar
- **Event listeners**: Evite `onclick` inline, use `addEventListener`

---

Made with ❤️ using Vite + TypeScript
