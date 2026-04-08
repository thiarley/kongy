# =============================================================================
# Kongy Frontend - Multi-stage Dockerfile
# Production: Nginx serving static files
# Development: Vite dev server with HMR
# =============================================================================

# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

ARG NPM_REGISTRY=

# Copy package files
COPY package*.json ./

# Disable strict SSL for corporate proxies (if needed)
RUN npm config set strict-ssl false

RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi

# Install dependencies needed for the production build
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript and create production bundle
RUN npm run build

FROM node:18-alpine AS dev

WORKDIR /app

ARG NPM_REGISTRY=

# Copy package files
COPY package*.json ./

# Disable strict SSL for corporate proxies
RUN npm config set strict-ssl false

RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi

# Install all dependencies (including dev)
RUN npm install

# Copy locales (needed for i18n)
COPY locales ./locales

# Expose Vite dev server port
EXPOSE 8081

# Start Vite dev server with host binding
CMD ["npm", "run", "dev", "--", "--host"]

# ============================================
# Production Stage (Nginx)
# ============================================
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy locales to nginx html
COPY --from=builder /app/locales /usr/share/nginx/html/locales

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
