export interface KongEntity {
    id: string;
    created_at?: number;
    updated_at?: number;
    tags?: string[];
}

export interface Service extends KongEntity {
    name: string;
    protocol: 'http' | 'https' | 'grpc' | 'grpcs' | 'tcp' | 'tls' | 'udp';
    host: string;
    port: number;
    path?: string;
    retries?: number;
    connect_timeout?: number;
    write_timeout?: number;
    read_timeout?: number;
}

export interface Route extends KongEntity {
    name?: string;
    protocols: string[];
    methods?: string[];
    paths?: string[];
    hosts?: string[];
    strip_path?: boolean;
    preserve_host?: boolean;
    service?: { id: string };
    regex_priority?: number;
    // UI specific
    source?: 'local' | 'remote';
    raw?: any;
}

export interface Consumer extends KongEntity {
    username?: string;
    custom_id?: string;
}

export interface Plugin extends KongEntity {
    name: string;
    config: Record<string, any>;
    enabled: boolean;
    route?: { id: string };
    service?: { id: string };
    consumer?: { id: string };
    protocols?: string[];
}

export interface Upstream extends KongEntity {
    name: string;
    algorithm?: string;
    slots?: number;
    healthchecks?: any;
}

export interface Target extends KongEntity {
    target: string;
    weight: number;
    upstream: { id: string };
    health?: 'HEALTHY' | 'UNHEALTHY' | 'DNS_ERROR' | 'UNKNOWN';
}

export interface Certificate extends KongEntity {
    cert: string;
    key: string;
    snis?: string[];
}

export interface SNI extends KongEntity {
    name: string;
    certificate: { id: string };
}

export interface ApiResponse<T> {
    data: T[];
    next?: string;
}
