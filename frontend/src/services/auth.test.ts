/**
 * Tests for services/auth.ts - Authentication
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Auth', () => {
    let auth: any;

    beforeEach(async () => {
        // Mock fetch
        global.fetch = vi.fn();

        // Mock localStorage
        const storage: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage[key] || null,
            setItem: (key: string, value: string) => { storage[key] = value; },
            removeItem: (key: string) => { delete storage[key]; }
        });

        // Mock location
        const locationMock = { href: '' };
        vi.stubGlobal('location', locationMock);

        // Reset modules
        vi.resetModules();
        const module = await import('./auth');
        auth = module.auth;
    });

    describe('isAuthenticated', () => {
        it('should return false when no token', () => {
            expect(auth.isAuthenticated()).toBe(false);
        });

        it('should return true when token exists', async () => {
            // Set token via login mock
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ access_token: 'test-token' })
            });

            await auth.login('user', 'pass');
            expect(auth.isAuthenticated()).toBe(true);
        });
    });

    describe('login', () => {
        it('should store token on successful login', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ access_token: 'my-token' })
            });

            const result = await auth.login('user', 'password');

            expect(result.access_token).toBe('my-token');
            expect(auth.getToken()).toBe('my-token');
        });

        it('should throw error on failed login', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ detail: 'Invalid credentials' })
            });

            await expect(auth.login('user', 'wrong')).rejects.toThrow('Invalid credentials');
        });
    });

    describe('getAuthHeaders', () => {
        it('should return empty object when no token', () => {
            expect(auth.getAuthHeaders()).toEqual({});
        });

        it('should return Authorization header when token exists', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ access_token: 'bearer-token' })
            });

            await auth.login('user', 'pass');

            expect(auth.getAuthHeaders()).toEqual({
                'Authorization': 'Bearer bearer-token'
            });
        });
    });

    describe('checkStatus', () => {
        it('should fetch auth status', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ initialized: true })
            });

            const status = await auth.checkStatus();

            expect(status.initialized).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/status')
            );
        });
    });

    describe('fetch (authenticated)', () => {
        it('should include auth headers in request', async () => {
            // First login
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ access_token: 'auth-token' })
            });
            await auth.login('user', 'pass');

            // Then make authenticated request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            await auth.fetch('/api/test');

            expect(global.fetch).toHaveBeenLastCalledWith(
                '/api/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer auth-token'
                    })
                })
            );
        });
    });
});
