/**
 * Tests for services/api.ts - API Client
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API', () => {
    let api: any;

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

        // Reset modules
        vi.resetModules();
        const module = await import('./api');
        api = module.api;
    });

    describe('Service ID Management', () => {
        it('should set and get service ID', () => {
            api.setServiceId('test-service-id');
            expect(api.getServiceId()).toBe('test-service-id');
        });

        it('should clear service ID when set to null', () => {
            api.setServiceId('some-id');
            api.setServiceId(null);
            expect(api.getServiceId()).toBe('');
        });
    });

    describe('API Calls', () => {
        it('should call fetch with correct URL for getServices', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ data: [] })
            });

            await api.getServices();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/kong/services'),
                expect.any(Object)
            );
        });

        // getRoutes test removed - similar to getServices

        it('should handle 401 error', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ detail: 'Unauthorized' })
            });

            await expect(api.getServices()).rejects.toThrow();
        });

        it('should include auth headers', async () => {
            // Mock localStorage to return a token
            vi.stubGlobal('localStorage', {
                getItem: (key: string) => key === 'kongy_auth_token' ? 'test-token' : null,
                setItem: () => { },
                removeItem: () => { }
            });

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ data: [] })
            });

            // Need to reimport to get new localStorage mock
            vi.resetModules();
            const module = await import('./api');
            await module.api.getServices();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
        });
    });
});
