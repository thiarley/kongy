import { API_BASE, METHODS, STORAGE_KEYS, ERROR_MESSAGES } from '../utils/constants';
import { auth } from './auth';
import type {
    Service, Route, Consumer, Plugin, Upstream, Target, Certificate, SNI, ApiResponse
} from '../types/kong';

class API {
    private serviceId: string;
    private _pluginsCache: string[] | null = null;
    private _pluginsCacheTime: number = 0;
    private _cacheTimeout: number = 5 * 60 * 1000; // 5 min

    constructor() {
        this.serviceId = localStorage.getItem(STORAGE_KEYS.SERVICE_ID) || '';
    }

    getServiceId() {
        return this.serviceId;
    }

    setServiceId(id: string | null) {
        this.serviceId = id || '';
        if (id) {
            localStorage.setItem(STORAGE_KEYS.SERVICE_ID, id);
        } else {
            localStorage.removeItem(STORAGE_KEYS.SERVICE_ID);
        }
    }

    // ==================== Core Fetch Method ====================

    private async parseResponse(response: Response): Promise<any> {
        const contentType = response.headers.get('content-type') || '';
        const rawText = await response.text();

        if (!rawText) {
            return null;
        }

        const looksLikeJson = contentType.includes('application/json') ||
            rawText.trim().startsWith('{') ||
            rawText.trim().startsWith('[');

        if (looksLikeJson) {
            try {
                return JSON.parse(rawText);
            } catch {
                if (!response.ok) {
                    throw new Error(rawText);
                }
            }
        }

        if (!response.ok) {
            throw new Error(rawText);
        }

        return { raw: rawText };
    }

    async fetchApi(method: string, endpoint: string, body: any = null): Promise<any> {
        if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
        const url = `${API_BASE}${endpoint}`;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...auth.getAuthHeaders()
            }
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (response.status === 401) {
                auth.logout();
                throw new Error(ERROR_MESSAGES.SESSION_EXPIRED);
            }

            if (response.status === 502) {
                throw new Error(ERROR_MESSAGES.KONG_UNAVAILABLE);
            }

            if (response.status === 204) {
                return { success: true };
            }

            const data = await this.parseResponse(response);

            if (!response.ok || data.error) {
                const message = data.detail ||
                    data.message ||
                    data.raw ||
                    data.details?.message ||
                    (typeof data.details === 'string' ? data.details : null) ||
                    ERROR_MESSAGES.UNKNOWN_ERROR;
                throw new Error(message);
            }

            return data;
        } catch (error) {
            console.error('[API] Error:', error);
            throw error;
        }
    }

    async fetchKong(method: string, endpoint: string, body: any = null) {
        if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
        return this.fetchApi(method, `/kong${endpoint}`, body);
    }

    private async fetchAllPages<T>(endpoint: string): Promise<ApiResponse<T>> {
        const items: T[] = [];
        let nextEndpoint = endpoint;

        while (nextEndpoint) {
            const response = await this.fetchKong(METHODS.GET, nextEndpoint);
            items.push(...(response.data || []));

            if (!response.next) {
                break;
            }

            try {
                const nextUrl = new URL(response.next);
                nextEndpoint = `${nextUrl.pathname}${nextUrl.search}`;
            } catch {
                nextEndpoint = response.next;
            }
        }

        return { data: items };
    }

    // ==================== Services ====================

    async getServices(): Promise<ApiResponse<Service>> {
        return this.fetchAllPages<Service>('/services');
    }

    async getService(id: string): Promise<Service> {
        return this.fetchKong(METHODS.GET, `/services/${id}`);
    }

    async createService(data: Partial<Service>) {
        return this.fetchKong(METHODS.POST, '/services', data);
    }

    async updateService(id: string, data: Partial<Service>) {
        return this.fetchKong(METHODS.PATCH, `/services/${id}`, data);
    }

    async deleteService(id: string) {
        return this.fetchKong(METHODS.DELETE, `/services/${id}`);
    }

    // ==================== Routes ====================

    async getRoutes(): Promise<ApiResponse<Route>> {
        if (!this.serviceId) return { data: [] }; // Optionally throw
        return this.fetchAllPages<Route>(`/services/${this.serviceId}/routes`);
    }

    async getAllRoutes(): Promise<ApiResponse<Route>> {
        return this.fetchAllPages<Route>('/routes');
    }

    async saveRoute(routeData: Partial<Route>, isUpdate = false) {
        let endpoint = '/routes';
        let method = METHODS.POST;

        if (isUpdate && routeData.id) {
            endpoint = `/routes/${routeData.id}`;
            method = METHODS.PUT;
        }

        if (!routeData.service && this.serviceId && !isUpdate) {
            routeData.service = { id: this.serviceId };
        }

        return this.fetchKong(method, endpoint, routeData);
    }

    async deleteRoute(id: string) {
        return this.fetchKong(METHODS.DELETE, `/routes/${id}`);
    }

    async updateRoute(id: string, data: Partial<Route>) {
        return this.fetchKong(METHODS.PATCH, `/routes/${id}`, data);
    }

    // ==================== Plugins ====================

    async getPlugins(routeId?: string, serviceId?: string): Promise<ApiResponse<Plugin>> {
        let endpoint = '/plugins';
        if (routeId) endpoint = `/routes/${routeId}/plugins`;
        else if (serviceId) endpoint = `/services/${serviceId}/plugins`;

        return this.fetchAllPages<Plugin>(endpoint);
    }

    async getAllPlugins(): Promise<ApiResponse<Plugin>> {
        return this.fetchAllPages<Plugin>('/plugins');
    }

    async getPluginSchema(pluginName: string): Promise<any> {
        return this.fetchKong(METHODS.GET, `/schemas/plugins/${pluginName}`);
    }

    async getAvailablePlugins(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this._pluginsCache && (now - this._pluginsCacheTime) < this._cacheTimeout) {
            return { enabled_plugins: this._pluginsCache };
        }

        try {
            const response = await this.fetchKong(METHODS.GET, '/plugins/enabled');
            let plugins: string[] = [];

            if (response.enabled_plugins) {
                plugins = response.enabled_plugins;
            } else if (response.data?.enabled_plugins) {
                plugins = response.data.enabled_plugins;
            }

            this._pluginsCache = plugins.sort();
            this._pluginsCacheTime = now;
            return { enabled_plugins: this._pluginsCache };
        } catch (e) {
            // Fallback
            return { enabled_plugins: ['rate-limiting', 'cors', 'key-auth', 'basic-auth', 'jwt'] };
        }
    }

    async createPlugin(pluginData: Partial<Plugin>) {
        return this.fetchKong(METHODS.POST, '/plugins', pluginData);
    }

    async updatePlugin(id: string, data: Partial<Plugin>) {
        return this.fetchKong(METHODS.PATCH, `/plugins/${id}`, data);
    }

    async deletePlugin(id: string) {
        return this.fetchKong(METHODS.DELETE, `/plugins/${id}`);
    }

    // ==================== Consumers ====================

    async getConsumers(): Promise<ApiResponse<Consumer>> {
        return this.fetchAllPages<Consumer>('/consumers');
    }

    async createConsumer(data: Partial<Consumer>) {
        return this.fetchKong(METHODS.POST, '/consumers', data);
    }

    async deleteConsumer(id: string) {
        return this.fetchKong(METHODS.DELETE, `/consumers/${id}`);
    }

    async getConsumerPlugins(consumerId: string): Promise<ApiResponse<Plugin>> {
        return this.fetchKong(METHODS.GET, `/consumers/${consumerId}/plugins`);
    }

    async createConsumerPlugin(consumerId: string, pluginName: string, config = {}) {
        return this.fetchKong(METHODS.POST, `/consumers/${consumerId}/plugins`, {
            name: pluginName,
            config,
            enabled: true
        });
    }

    // ==================== Plugin Helpers (Legacy Restoration) ====================

    async createRoutePlugin(routeId: string, pluginName: string, config = {}) {
        return this.fetchKong(METHODS.POST, '/plugins', {
            name: pluginName,
            route: { id: routeId },
            config,
            enabled: true
        });
    }

    async createServicePlugin(serviceId: string, pluginName: string, config = {}) {
        return this.fetchKong(METHODS.POST, '/plugins', {
            name: pluginName,
            service: { id: serviceId },
            config,
            enabled: true
        });
    }

    async applyPlugin(pluginName: string, pluginConfig: any, routeIds: string[]) {
        const results = await Promise.allSettled(
            routeIds.map(routeId => this.createRoutePlugin(routeId, pluginName, pluginConfig))
        );

        return {
            results: results.map((result, index) => ({
                routeId: routeIds[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? (result as PromiseFulfilledResult<any>).value : null,
                error: result.status === 'rejected' ? (result as PromiseRejectedResult).reason?.message : null
            }))
        };
    }

    // ==================== Upstreams ====================

    async getUpstreams(): Promise<ApiResponse<Upstream>> {
        return this.fetchAllPages<Upstream>('/upstreams');
    }

    async createUpstream(data: Partial<Upstream>) {
        return this.fetchKong(METHODS.POST, '/upstreams', data);
    }

    async deleteUpstream(id: string) {
        return this.fetchKong(METHODS.DELETE, `/upstreams/${id}`);
    }

    async getUpstreamTargets(upstreamId: string): Promise<ApiResponse<Target>> {
        return this.fetchKong(METHODS.GET, `/upstreams/${upstreamId}/targets`);
    }

    async addUpstreamTarget(upstreamId: string, data: Partial<Target>) {
        return this.fetchKong(METHODS.POST, `/upstreams/${upstreamId}/targets`, data);
    }

    async deleteUpstreamTarget(upstreamId: string, targetId: string) {
        return this.fetchKong(METHODS.DELETE, `/upstreams/${upstreamId}/targets/${targetId}`);
    }

    async updateUpstream(id: string, data: Partial<Upstream>) {
        return this.fetchKong(METHODS.PATCH, `/upstreams/${id}`, data);
    }

    async getUpstreamHealth(upstreamId: string) {
        return this.fetchKong(METHODS.GET, `/upstreams/${upstreamId}/health`);
    }

    // ==================== Service Routes ====================
    async getServiceRoutes(serviceId: string): Promise<ApiResponse<Route>> {
        return this.fetchAllPages<Route>(`/services/${serviceId}/routes`);
    }

    // ==================== Certificates ====================

    async getCertificates(): Promise<ApiResponse<Certificate>> {
        return this.fetchAllPages<Certificate>('/certificates');
    }

    async createCertificate(data: Partial<Certificate>) {
        return this.fetchKong(METHODS.POST, '/certificates', data);
    }

    async updateCertificate(id: string, data: Partial<Certificate>) {
        return this.fetchKong(METHODS.PATCH, `/certificates/${id}`, data);
    }

    async deleteCertificate(id: string) {
        return this.fetchKong(METHODS.DELETE, `/certificates/${id}`);
    }

    // ==================== Node Status / Dashboard ====================

    async getNodeStatus() {
        return this.fetchKong(METHODS.GET, '/');
    }

    async getNodeInfo() {
        return this.fetchKong(METHODS.GET, '/');
    }

    // ==================== System Settings ====================

    async getConnectionConfig() {
        return this.fetchApi(METHODS.GET, '/system/config/connection');
    }

    async updateConnectionConfig(url: string) {
        const res = await fetch('/api/system/config/connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...auth.getAuthHeaders()
            },
            body: JSON.stringify({ kong_admin_url: url })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to update connection');
        }
        return res.json();
    }

    // ==================== Extended Consumer Methods ====================

    async updateConsumer(id: string, data: Partial<Consumer>) {
        return this.fetchKong(METHODS.PATCH, `/consumers/${id}`, data);
    }

    // ACLs
    async getConsumerAcls(consumerId: string) {
        return this.fetchKong(METHODS.GET, `/consumers/${consumerId}/acls`);
    }

    async addConsumerAcl(consumerId: string, group: string) {
        return this.fetchKong(METHODS.POST, `/consumers/${consumerId}/acls`, { group });
    }

    async updateConsumerAcl(consumerId: string, aclId: string, group: string) {
        return this.fetchKong(METHODS.PATCH, `/consumers/${consumerId}/acls/${aclId}`, { group });
    }

    async deleteConsumerAcl(consumerId: string, aclId: string) {
        return this.fetchKong(METHODS.DELETE, `/consumers/${consumerId}/acls/${aclId}`);
    }

    // Credentials
    async getConsumerCredentials(consumerId: string, plugin: string) {
        // e.g. /consumers/{id}/basic-auth
        return this.fetchKong(METHODS.GET, `/consumers/${consumerId}/${plugin}`);
    }

    async createConsumerCredential(consumerId: string, plugin: string, data: any) {
        return this.fetchKong(METHODS.POST, `/consumers/${consumerId}/${plugin}`, data);
    }

    async updateConsumerCredential(consumerId: string, plugin: string, credentialId: string, data: any) {
        return this.fetchKong(METHODS.PATCH, `/consumers/${consumerId}/${plugin}/${credentialId}`, data);
    }

    async deleteConsumerCredential(consumerId: string, plugin: string, credentialId: string) {
        return this.fetchKong(METHODS.DELETE, `/consumers/${consumerId}/${plugin}/${credentialId}`);
    }

    // ==================== Copy Orchestration ====================

    async copyPlugins(targetType: 'route' | 'service', targetId: string, sourceType: 'route' | 'service', sourceId: string, pluginIds?: string[]) {
        return this.fetchApi(METHODS.POST, '/kong/copy-plugins', {
            source: { type: sourceType, id: sourceId },
            target: { type: targetType, id: targetId },
            plugin_ids: pluginIds
        });
    }
}

export const api = new API();
