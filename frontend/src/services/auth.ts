import { API_BASE, STORAGE_KEYS } from '../utils/constants';

export class Auth {
    private token: string | null;

    constructor() {
        this.token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null;
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }

    getToken(): string | null {
        return this.token;
    }

    async checkStatus(): Promise<any> {
        const response = await fetch(`${API_BASE}/auth/status`);
        if (!response.ok) {
            throw new Error('Failed to check auth status');
        }
        return response.json();
    }

    async setup(username: string, password: string, kong_admin_url?: string): Promise<any> {
        const payload: any = { username, password };
        if (kong_admin_url) {
            payload.kong_admin_url = kong_admin_url;
        }

        const response = await fetch(`${API_BASE}/auth/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            const msg = Array.isArray(error.detail)
                ? error.detail.map((e: any) => e.msg).join(', ')
                : error.detail || 'Setup failed';
            throw new Error(msg);
        }

        return response.json();
    }

    async login(username: string, password: string): Promise<any> {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            const msg = Array.isArray(error.detail)
                ? error.detail.map((e: any) => e.msg).join(', ')
                : error.detail || 'Invalid credentials';
            throw new Error(msg);
        }

        const data = await response.json();
        this.token = data.access_token;
        if (this.token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, this.token);
        }

        return data;
    }

    async getCurrentUser(): Promise<any> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
                throw new Error('Session expired');
            }
            throw new Error('Failed to get user info');
        }

        return response.json();
    }

    logout(): void {
        this.token = null;
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login.html';
        }
    }

    getAuthHeaders(): HeadersInit {
        if (!this.token) {
            return {};
        }
        return { 'Authorization': `Bearer ${this.token}` };
    }

    /**
     * Make authenticated API request
     * Handles 401 automatically with logout
     */
    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        const headers = {
            ...options.headers,
            ...this.getAuthHeaders()
        };

        const response = await fetch(url, { ...options, headers });

        // Handle token expiration
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }

        return response;
    }
}

export const auth = new Auth();
