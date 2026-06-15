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
        store.clearFilters();
        store.sortKey = 'created_at';
        store.sortOrder = 'desc';
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

        it('should sort routes by default creation date descending', () => {
            store.setRoutes([
                { id: '1', name: 'route-old', created_at: 1000 },
                { id: '2', name: 'route-new', created_at: 5000 },
                { id: '3', name: 'route-middle', created_at: 3000 }
            ]);

            const sorted = store.filteredRoutes;
            expect(sorted).toHaveLength(3);
            expect(sorted[0].id).toBe('2'); // new
            expect(sorted[1].id).toBe('3'); // middle
            expect(sorted[2].id).toBe('1'); // old
        });

        it('should sort routes by name ascending and descending', () => {
            store.setRoutes([
                { id: '1', name: 'B-route' },
                { id: '2', name: 'C-route' },
                { id: '3', name: 'A-route' }
            ]);

            store.setSort('name');
            expect(store.sortKey).toBe('name');
            expect(store.sortOrder).toBe('asc');

            let sorted = store.filteredRoutes;
            expect(sorted[0].name).toBe('A-route');
            expect(sorted[1].name).toBe('B-route');
            expect(sorted[2].name).toBe('C-route');

            store.setSort('name');
            expect(store.sortOrder).toBe('desc');

            sorted = store.filteredRoutes;
            expect(sorted[0].name).toBe('C-route');
            expect(sorted[1].name).toBe('B-route');
            expect(sorted[2].name).toBe('A-route');
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
