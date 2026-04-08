import { Route, Consumer, Plugin } from './types/kong';

interface State {
    routes: (Route & { source?: string, raw?: any })[];
    consumers: Consumer[];
    plugins: Plugin[];
    enabledPlugins: string[];

    // Selection
    selectedRoutes: Set<string>;

    // UI State
    isLoading: boolean;
    currentView: string;

    // Filters
    filters: {
        search: string;
        method: string | null;
        access: 'publico' | 'privado' | null;
        hasPlugins: boolean | null;
    };
}

class Store {
    public state: State;
    private listeners: Function[];

    constructor() {
        this.state = {
            routes: [],
            consumers: [],
            plugins: [],
            enabledPlugins: [],

            selectedRoutes: new Set(),

            isLoading: false,
            currentView: 'routes',

            filters: {
                search: '',
                method: null,
                access: null,
                hasPlugins: null
            }
        };

        this.listeners = [];
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }

    setLoading(loading: boolean) {
        this.state.isLoading = loading;
        this.notify();
    }

    setCurrentView(view: string) {
        this.state.currentView = view;
        this.notify();
    }

    setRoutes(routes: Route[]) {
        this.state.routes = routes.map(r => ({
            ...r,
            source: (r as any).source || 'remote',
            raw: (r as any).raw || r
        }));
        this.state.selectedRoutes.clear();
        this.notify();
    }

    addRoute(route: Route) {
        this.state.routes.push({
            ...route,
            source: (route as any).source || 'local',
            raw: (route as any).raw || route
        });
        this.notify();
    }

    updateRoute(routeId: string, updates: Partial<Route>) {
        const index = this.state.routes.findIndex(r => r.id === routeId);
        if (index !== -1) {
            this.state.routes[index] = {
                ...this.state.routes[index],
                ...(updates as any).raw || updates,
                raw: (updates as any).raw || { ...this.state.routes[index].raw, ...updates }
            };
            this.notify();
        }
    }

    removeRoute(routeId: string) {
        this.state.routes = this.state.routes.filter(r => r.id !== routeId);
        this.state.selectedRoutes.delete(routeId);
        this.notify();
    }

    addLocalRoutes(routes: Route[]) {
        const localRoutes: Route[] = routes.map(r => ({
            ...r,
            id: r.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: 'local' as const, // Fix type inference
            plugins: (r as any).plugins || [],
            raw: { ...r, plugins: (r as any).plugins || [] }
        }));

        this.state.routes = [...this.state.routes, ...localRoutes];
        localRoutes.forEach(r => {
            if (r.id) this.state.selectedRoutes.add(r.id);
        });
        this.notify();
    }

    clearLocalRoutes() {
        this.state.routes = this.state.routes.filter(r => r.source !== 'local');
        this.state.selectedRoutes = new Set(
            Array.from(this.state.selectedRoutes).filter(routeId =>
                this.state.routes.some(r => r.id === routeId)
            )
        );
        this.notify();
    }

    get localRoutes() {
        return this.state.routes.filter(r => r.source === 'local');
    }

    get remoteRoutes() {
        return this.state.routes.filter(r => r.source === 'remote');
    }

    selectRoute(routeId: string, isSelected: boolean) {
        if (isSelected) {
            this.state.selectedRoutes.add(routeId);
        } else {
            this.state.selectedRoutes.delete(routeId);
        }
        this.notify();
    }

    selectAllRoutes(isSelected: boolean) {
        if (isSelected) {
            this.filteredRoutes.forEach(r => {
                if (r.id) this.state.selectedRoutes.add(r.id);
            });
        } else {
            this.filteredRoutes.forEach(r => {
                if (r.id) this.state.selectedRoutes.delete(r.id);
            });
        }
        this.notify();
    }

    clearSelection() {
        this.state.selectedRoutes.clear();
        this.notify();
    }

    setConsumers(consumers: Consumer[]) {
        this.state.consumers = consumers;
        this.notify();
    }

    addConsumer(consumer: Consumer) {
        this.state.consumers.push(consumer);
        this.notify();
    }

    removeConsumer(consumerId: string) {
        this.state.consumers = this.state.consumers.filter(c => c.id !== consumerId);
        this.notify();
    }

    setPlugins(plugins: Plugin[]) {
        this.state.plugins = plugins;
        this.notify();
    }

    setEnabledPlugins(plugins: string[]) {
        this.state.enabledPlugins = plugins;
        this.notify();
    }

    getRoutePlugins(routeId: string) {
        return this.state.plugins.filter(p =>
            p.route && p.route.id === routeId && p.enabled
        );
    }

    setFilter(key: keyof State['filters'], value: any) {
        (this.state.filters as any)[key] = value;
        this.notify();
    }

    setSearchFilter(term: string) {
        this.state.filters.search = term.toLowerCase();
        this.notify();
    }

    clearFilters() {
        this.state.filters = {
            search: '',
            method: null,
            access: null,
            hasPlugins: null
        };
        this.notify();
    }

    get filteredRoutes() {
        const { search, method, access, hasPlugins } = this.state.filters;

        return this.state.routes.filter(r => {
            const raw = r.raw || r;

            if (search) {
                const searchableText = [
                    r.name || '',
                    r.id || '',
                    (raw.paths || []).join(' '),
                    (raw.methods || []).join(' '),
                    (raw.tags || []).join(' ')
                ].join(' ').toLowerCase();

                if (!searchableText.includes(search)) return false;
            }

            if (method && raw.methods && !raw.methods.includes(method)) return false;

            if (access) {
                const tags = raw.tags || [];
                const isPublic = tags.includes('publico');
                if (access === 'publico' && !isPublic) return false;
                if (access === 'privado' && isPublic) return false;
            }

            if (hasPlugins !== null) {
                const routePlugins = this.getRoutePlugins(r.id);
                if (hasPlugins && routePlugins.length === 0) return false;
                if (!hasPlugins && routePlugins.length > 0) return false;
            }

            return true;
        });
    }

    get selectedCount() {
        return this.state.selectedRoutes.size;
    }

    get selectedIds() {
        return Array.from(this.state.selectedRoutes).filter(Boolean);
    }

    get selectedRoutesArray() {
        return this.state.routes.filter(r => r.id && this.state.selectedRoutes.has(r.id));
    }

    get stats() {
        const routes = this.state.routes;
        const total = routes.length;
        const remote = routes.filter(r => r.source === 'remote').length;
        const local = routes.filter(r => r.source !== 'remote').length;
        const publicRoutes = routes.filter(r =>
            ((r as any).raw?.tags || r.tags || []).includes('publico')
        ).length;
        const withPlugins = routes.filter(r =>
            this.getRoutePlugins(r.id).length > 0
        ).length;

        return {
            total,
            remote,
            local,
            public: publicRoutes,
            private: total - publicRoutes,
            withPlugins,
            selected: this.selectedCount
        };
    }
}

export const store = new Store();
