/**
 * Tests for store.ts - State Management
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('Store', () => {
    let store: any;

    beforeEach(async () => {
        const module = await import('./store');
        store = module.store;
        store.setRoutes([]);
        store.setConsumers([]);
        store.setPlugins([]);
        store.clearSelection();
    });

    describe('Routes', () => {
        it('should add routes', () => {
            const routes = [
                { id: '1', name: 'route1', paths: ['/api'] },
                { id: '2', name: 'route2', paths: ['/v2'] }
            ];

            store.setRoutes(routes);
            expect(store.state.routes).toHaveLength(2);
        });

        it('should filter routes by search', () => {
            store.setRoutes([
                { id: '1', name: 'users-api', paths: ['/users'] },
                { id: '2', name: 'products-api', paths: ['/products'] }
            ]);

            store.setFilter('search', 'users');
            const filtered = store.filteredRoutes;
            expect(filtered).toHaveLength(1);
            expect(filtered[0].name).toBe('users-api');
        });

        it('should remove route by id', () => {
            store.setRoutes([
                { id: '1', name: 'route1' },
                { id: '2', name: 'route2' }
            ]);

            store.removeRoute('1');
            expect(store.state.routes).toHaveLength(1);
            expect(store.state.routes[0].id).toBe('2');
        });
    });

    describe('Plugins', () => {
        it('should set and get plugins', () => {
            store.setPlugins([
                { id: 'p1', name: 'cors', route: { id: 'r1' } },
                { id: 'p2', name: 'rate-limiting', route: { id: 'r1' } },
                { id: 'p3', name: 'auth', route: { id: 'r2' } }
            ]);

            expect(store.state.plugins).toHaveLength(3);
        });
    });

    describe('Loading State', () => {
        it('should set loading state', () => {
            store.setLoading(true);
            expect(store.state.isLoading).toBe(true);

            store.setLoading(false);
            expect(store.state.isLoading).toBe(false);
        });
    });
});
