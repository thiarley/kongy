// API Configuration
export const API_BASE = '/api';

// Kong Endpoints
export const ENDPOINTS = {
    // Auth
    AUTH_STATUS: '/auth/status',
    AUTH_SETUP: '/auth/setup',
    AUTH_LOGIN: '/auth/login',
    AUTH_ME: '/auth/me',
    AUTH_LOGOUT: '/auth/logout',

    // Kong Status
    STATUS: '/kong/',

    // Services
    SERVICES: '/services',
    SERVICE: (id: string) => `/services/${id}`,
    SERVICE_ROUTES: (id: string) => `/services/${id}/routes`,
    SERVICE_PLUGINS: (id: string) => `/services/${id}/plugins`,

    // Routes
    ROUTES: '/routes',
    ROUTE: (id: string) => `/routes/${id}`,
    ROUTE_PLUGINS: (id: string) => `/routes/${id}/plugins`,

    // Plugins
    PLUGINS: '/plugins',
    PLUGIN: (id: string) => `/plugins/${id}`,
    PLUGINS_ENABLED: '/plugins/enabled',
    PLUGIN_SCHEMA: (name: string) => `/plugins/schema/${name}`,

    // Consumers
    CONSUMERS: '/consumers',
    CONSUMER: (id: string) => `/consumers/${id}`,
    CONSUMER_CREDENTIALS: (id: string, type: string) => `/consumers/${id}/${type}`,
    CONSUMER_CREDENTIAL: (id: string, type: string, credId: string) => `/consumers/${id}/${type}/${credId}`,

    // Upstreams
    UPSTREAMS: '/upstreams',
    UPSTREAM: (id: string) => `/upstreams/${id}`,
    UPSTREAM_TARGETS: (id: string) => `/upstreams/${id}/targets`,

    // Certificates
    CERTIFICATES: '/certificates',
    CERTIFICATE: (id: string) => `/certificates/${id}`,
    SNIS: '/snis',
    SNI: (id: string) => `/snis/${id}`,

    // Credential types
    KEY_AUTH: 'key-auth',
    BASIC_AUTH: 'basic-auth',
    JWT: 'jwt',
    OAUTH2: 'oauth2',
    HMAC_AUTH: 'hmac-auth',
    ACLS: 'acls'
};

// HTTP Methods
export const METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE'
};

// Plugin Icons
export const PLUGIN_ICONS: Record<string, string> = {
    'trt-custom-auth': '🔒',
    'cors': '🌐',
    'rate-limiting': '⏱️',
    'key-auth': '🔑',
    'basic-auth': '👤',
    'jwt': '🎫',
    'acl': '🚪',
    'ip-restriction': '🛡️',
    'bot-detection': '🤖',
    'request-transformer': '🔄',
    'response-transformer': '📝',
    'prometheus': '📊',
    'file-log': '📁',
    'http-log': '📡',
    'default': '🧩'
};

// Error Messages
export const ERROR_MESSAGES = {
    CONNECTION_FAILED: 'Falha na conexão com o Kong',
    INVALID_TOKEN: 'Token inválido ou expirado',
    SESSION_EXPIRED: 'Sessão expirada. Faça login novamente.',
    SERVICE_NOT_SELECTED: 'Nenhum serviço selecionado',
    NO_ROUTES_SELECTED: 'Nenhuma rota selecionada',
    ROUTE_SAVE_FAILED: 'Falha ao salvar rota',
    ROUTE_DELETE_FAILED: 'Falha ao deletar rota',
    PLUGIN_APPLY_FAILED: 'Falha ao aplicar plugin',
    SCHEMA_LOAD_FAILED: 'Falha ao carregar schema do plugin',
    NETWORK_ERROR: 'Erro de rede',
    UNKNOWN_ERROR: 'Erro desconhecido',
    KONG_UNAVAILABLE: 'Kong Admin API indisponível'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    CONNECTED: 'Conectado com sucesso',
    ROUTE_SAVED: 'Rota salva com sucesso',
    ROUTE_DELETED: 'Rota deletada com sucesso',
    ROUTES_SYNCED: 'Rotas sincronizadas',
    PLUGIN_APPLIED: 'Plugin aplicado com sucesso',
    CONSUMER_CREATED: 'Consumer criado com sucesso',
    CONSUMER_DELETED: 'Consumer deletado com sucesso',
    CREDENTIAL_CREATED: 'Credencial criada com sucesso',
    CREDENTIAL_DELETED: 'Credencial removida com sucesso'
};

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'kongy_auth_token',
    SERVICE_ID: 'kongy_service_id',
    LOCALE: 'kongy_locale'
};

// Route Access Types
export const ACCESS_TYPES = {
    PUBLIC: 'publico',
    PRIVATE: 'privado'
} as const;

// Default Tags
export const DEFAULT_TAGS = {
    AUTO_GENERATED: 'auto-generated',
    KONGY: 'kongy'
} as const;

// Common HTTP Methods for Routes
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;

// Protocols
export const PROTOCOLS = ['http', 'https', 'grpc', 'grpcs', 'tcp', 'tls', 'udp'] as const;

// Default Route Configuration
export const DEFAULT_ROUTE = {
    name: '',
    paths: [] as string[],
    methods: ['GET'],
    protocols: ['http', 'https'],
    strip_path: true,
    preserve_host: false,
    tags: [] as string[]
};

// Plugin Configuration Defaults
export const PLUGIN_DEFAULTS: Record<string, any> = {
    'cors': {
        origins: ['*'],
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        headers: ['Accept', 'Authorization', 'Content-Type'],
        exposed_headers: [],
        credentials: true,
        max_age: 3600
    },
    'rate-limiting': {
        minute: 100,
        hour: 1000,
        policy: 'local'
    },
    'key-auth': {
        key_names: ['apikey'],
        hide_credentials: true
    }
};
