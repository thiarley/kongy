/**
 * Main Application Controller
 * Refactored to use modular views
 */
import { auth } from './services/auth';
import { api } from './services/api';
import { UI } from './ui';
import { store } from './store';
import { showToast, setBusy } from './utils';

// Import views
import {
    confirmAction,
    loadDashboard,
    loadServicesView,
    handleAddService,
    bindServiceCallbacks,
    refreshRoutes,
    handleAddRoute,
    handleExportRoutes,
    handleLoadFile,
    handleBatchEdit,
    bindRouteCallbacks,
    loadConsumersView,
    loadConsumerDetails,
    loadConsumerAcls,
    loadConsumerCredentials,
    loadConsumerPlugins,
    handleAddConsumer,
    getCurrentConsumer,
    loadUpstreamsView,
    handleAddUpstream,
    handleAddTarget,
    loadCertificatesView,
    handleAddCertificate,
    populatePluginSelect,
    handleAddPlugin,
    handleSavePluginConfig,
    bindPluginCallbacks,
    handleBatchPlugin // <--- ADDED
} from './views';

const VIEWS = {
    LOADING: 'view-loading',
    SERVICES: 'view-services',
    ROUTES: 'view-routes',
    CONSUMERS: 'view-consumers',
    UPSTREAMS: 'view-upstreams',
    CERTIFICATES: 'view-certificates',
    DASHBOARD: 'view-dashboard',
    SETTINGS: 'settingsModal',
    CONSUMER_DETAILS: 'view-consumer-details'
};

export class App {
    private ui: UI;

    constructor() {
        this.ui = new UI(api);
    }

    async init() {
        console.log('[DEBUG] App.init started');
        this.ui.init();
        console.log('[DEBUG] UI.init finished');
        this.bindEvents();

        // Check authentication
        if (auth.isAuthenticated()) {
            await this.loadServicesView();
        } else {
            this.switchView('LOADING');
        }

        // Setup plugin select
        await populatePluginSelect();
    }

    // ==================== View Switching ====================

    switchView(viewName: keyof typeof VIEWS | string) {
        // Try direct lookup, then uppercase lookup (for 'services' -> 'SERVICES'), then use as is
        const viewId = VIEWS[viewName as keyof typeof VIEWS] ||
            VIEWS[viewName.toUpperCase() as keyof typeof VIEWS] ||
            viewName;

        // Hide all views
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
        document.getElementById('view-loading')?.classList.add('hidden');

        // Manage App Layout visibility
        if (viewName === 'LOADING') {
            document.getElementById('app-layout')?.classList.add('hidden');
        } else {
            document.getElementById('app-layout')?.classList.remove('hidden');
        }

        // Show target view
        const target = document.getElementById(viewId);
        if (target) target.classList.remove('hidden');

        // Update nav active state
        document.querySelectorAll('.btn-nav').forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector(`.btn-nav[data-view="${viewName}"]`);
        if (navItem) navItem.classList.add('active');
    }

    updateServiceContext(serviceId: string | null) {
        const container = document.getElementById('sidebarServiceContext');
        const badge = document.getElementById('currentServiceBadge');

        if (serviceId) {
            api.setServiceId(serviceId);
            if (container) container.classList.remove('hidden');
            if (badge) badge.textContent = serviceId; // Ideally fetch name
        } else {
            api.setServiceId(null);
            if (container) container.classList.add('hidden');
        }
    }

    // ==================== View Loaders (Delegating to modules) ====================

    async loadServicesView() {
        await loadServicesView(this.ui, {
            switchView: this.switchView.bind(this),
            updateServiceContext: this.updateServiceContext.bind(this),
            refreshRoutes: this.refreshRoutes.bind(this)
        });
    }

    async loadDashboard() {
        await loadDashboard({
            switchView: this.switchView.bind(this)
        });
    }

    async refreshRoutes() {
        this.switchView('ROUTES');
        await refreshRoutes();
    }

    async loadConsumersView() {
        await loadConsumersView(this.ui, {
            switchView: this.switchView.bind(this)
        });
    }

    async loadUpstreamsView() {
        await loadUpstreamsView(this.ui, {
            switchView: this.switchView.bind(this)
        });
    }

    async loadCertificatesView() {
        await loadCertificatesView(this.ui, {
            switchView: this.switchView.bind(this)
        });
    }

    // ==================== Event Bindings ====================

    bindEvents() {
        // Bind view callbacks from modules
        bindServiceCallbacks(this.ui, {
            switchView: this.switchView.bind(this),
            updateServiceContext: this.updateServiceContext.bind(this),
            refreshRoutes: this.refreshRoutes.bind(this)
        });

        bindRouteCallbacks(this.ui);
        bindPluginCallbacks(this.ui);

        // Consumer callbacks
        this.ui.triggerConsumerDelete = async (consumer: any) => {
            if (await confirmAction(`Deletar consumer ${consumer.username || consumer.id}?`)) {
                try {
                    await api.deleteConsumer(consumer.id);
                    this.loadConsumersView();
                    showToast('Consumer deletado', 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            }
        };

        this.ui.triggerConsumerDetails = async (consumer: any) => {
            await loadConsumerDetails(this.ui, consumer, {
                switchView: this.switchView.bind(this)
            });
        };

        // Setup navigation
        console.log('Setup Navigation...');
        this.setupNavigation();

        // Setup toolbar buttons
        console.log('Setup Toolbar Buttons...');
        this.setupToolbarButtons();

        // Setup modal buttons
        this.setupModalButtons();

        // Setup consumer tabs
        this.setupConsumerTabs();
        console.log('Bind Events Complete');
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.btn-nav[data-view]');
        console.log(`Found ${navItems.length} nav items`);

        navItems.forEach(item => {
            const view = (item as HTMLElement).dataset.view;
            console.log(`Binding click for view: ${view}`);

            // Remove old listeners (clone hack)
            const newItem = item.cloneNode(true);
            item.parentNode?.replaceChild(newItem, item);

            newItem.addEventListener('click', (e) => {
                console.log(`Nav Clicked: ${view}`);
                e.preventDefault();

                if (view === 'SERVICES') this.loadServicesView();
                else if (view === 'ROUTES') this.refreshRoutes();
                else if (view === 'CONSUMERS') this.loadConsumersView();
                else if (view === 'UPSTREAMS') this.loadUpstreamsView();
                else if (view === 'CERTIFICATES') this.loadCertificatesView();
                else if (view === 'DASHBOARD') this.loadDashboard();
            });
        });

        // All services button

        // All services button
        document.getElementById('allServicesBtn')?.addEventListener('click', () => {
            this.updateServiceContext(null);
            this.loadServicesView();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            auth.logout();
        });
    }

    setupToolbarButtons() {
        const check = (id: string) => {
            const el = document.getElementById(id);
            if (!el) console.warn(`Toolbar button not found: ${id}`);
            return el;
        };

        // Add service
        check('addServiceBtn')?.addEventListener('click', () => {
            console.log('Add Service Clicked');
            handleAddService(this.ui, {
                switchView: this.switchView.bind(this),
                updateServiceContext: this.updateServiceContext.bind(this),
                refreshRoutes: this.refreshRoutes.bind(this)
            });
        });

        // Add route
        check('addRouteBtn')?.addEventListener('click', () => {
            console.log('Add Route Clicked');
            handleAddRoute(this.ui);
        });

        // Add consumer
        check('addConsumerBtn')?.addEventListener('click', () => {
            console.log('Add Consumer Clicked');
            handleAddConsumer(this.ui, {
                switchView: this.switchView.bind(this)
            });
        });

        // Add upstream
        check('addUpstreamBtn')?.addEventListener('click', () => {
            console.log('Add Upstream Clicked');
            handleAddUpstream(this.ui, {
                switchView: this.switchView.bind(this)
            });
        });

        // Add certificate
        check('addCertificateBtn')?.addEventListener('click', () => {
            console.log('Add Certificate Clicked');
            handleAddCertificate(this.ui, {
                switchView: this.switchView.bind(this)
            });
        });

        // ==================== Actions (Refresh, Export, Load) ====================

        // Dashboard
        check('refreshDashboardBtn')?.addEventListener('click', () => this.loadDashboard());

        // Services
        check('refreshServicesBtn')?.addEventListener('click', () => this.loadServicesView());

        // Routes
        check('refreshRoutesBtn')?.addEventListener('click', () => this.refreshRoutes());
        check('refreshRoutesBtn')?.addEventListener('click', () => this.refreshRoutes());
        check('loadFileBtn')?.addEventListener('click', () => document.getElementById('routeFileInput')?.click());
        document.getElementById('routeFileInput')?.addEventListener('change', (e) => handleLoadFile(e));

        check('exportRoutesBtn')?.addEventListener('click', () => handleExportRoutes());
        check('exportRoutesBtn')?.addEventListener('click', () => handleExportRoutes());

        check('batchEditBtn')?.addEventListener('click', () => handleBatchEdit(this.ui));
        check('pluginBatchBtn')?.addEventListener('click', () => handleBatchPlugin(this.ui));

        check('deleteSelectedBtn')?.addEventListener('click', () => {
            // Deletion logic triggers usually handled by UI confirmation, verify implementation later
            console.log('Delete Selected Clicked - Placeholder');
        });

        // Consumers
        check('refreshConsumersBtn')?.addEventListener('click', () => this.loadConsumersView());
        check('backToConsumersBtn')?.addEventListener('click', () => this.loadConsumersView());

        // Upstreams/Certs
        check('refreshUpstreamsBtn')?.addEventListener('click', () => this.loadUpstreamsView());
        check('refreshCertificatesBtn')?.addEventListener('click', () => this.loadCertificatesView());

        // Batch edit
        document.getElementById('batchEditBtn')?.addEventListener('click', () => {
            handleBatchEdit(this.ui);
        });

        // Batch plugin
        document.getElementById('batchPluginBtn')?.addEventListener('click', () => {
            const ids = store.selectedIds;
            if (ids.length === 0) return showToast('Selecione rotas primeiro', 'warning');

            this.ui.openModal('pluginsModal');
            const modal = document.getElementById('pluginsModal');
            if (modal) {
                modal.dataset.mode = 'batch';
                modal.dataset.entityType = 'route';
            }
            populatePluginSelect();
        });

        // Export routes
        document.getElementById('exportRoutesBtn')?.addEventListener('click', () => {
            if (store.selectedIds.length === 0) return showToast('Selecione rotas primeiro', 'warning');
            handleExportRoutes();
        });

        // Import routes
        document.getElementById('importRoutesBtn')?.addEventListener('click', () => {
            document.getElementById('routeFileInput')?.click();
        });

        document.getElementById('routeFileInput')?.addEventListener('change', (e) => {
            handleLoadFile(e);
        });

        // Refresh
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshRoutes();
        });
    }

    setupModalButtons() {
        // Add plugin button
        document.getElementById('addPluginBtn')?.addEventListener('click', () => {
            handleAddPlugin(this.ui);
        });

        // Save plugin config
        document.getElementById('savePluginConfigBtn')?.addEventListener('click', () => {
            handleSavePluginConfig(this.ui);
        });

        // Add target
        document.getElementById('addTargetBtn')?.addEventListener('click', () => {
            handleAddTarget(this.ui);
        });

        // Add ACL
        document.getElementById('addAclBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const group = (document.getElementById('acl_group') as HTMLInputElement)?.value;
            if (!group) return showToast('Grupo é obrigatório', 'warning');

            try {
                await api.addConsumerAcl(consumer.id, group);
                loadConsumerAcls(consumer.id);
                (document.getElementById('acl_group') as HTMLInputElement).value = '';
                showToast('ACL adicionada', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // Add credential
        document.getElementById('addCredentialBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const type = (document.getElementById('credential_type') as HTMLSelectElement)?.value;
            const key = (document.getElementById('credential_key') as HTMLInputElement)?.value;

            if (!type) return showToast('Tipo é obrigatório', 'warning');

            try {
                await api.createConsumerCredential(consumer.id, type, { key: key || undefined });
                loadConsumerCredentials(consumer.id, type);
                (document.getElementById('credential_key') as HTMLInputElement).value = '';
                showToast('Credencial adicionada', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // Save consumer details
        document.getElementById('saveConsumerDetailsBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const username = (document.getElementById('edit_consumer_username') as HTMLInputElement)?.value;
            const custom_id = (document.getElementById('edit_consumer_custom_id') as HTMLInputElement)?.value;
            const tags = (document.getElementById('edit_consumer_tags') as HTMLInputElement)?.value;

            try {
                await api.updateConsumer(consumer.id, {
                    username: username || undefined,
                    custom_id: custom_id || undefined,
                    tags: tags ? tags.split(',').map(t => t.trim()) : []
                });
                showToast('Consumer atualizado', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // Add consumer plugin
        document.getElementById('addConsumerPluginBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const pluginName = (document.getElementById('consumer_plugin_select') as HTMLSelectElement)?.value;
            if (!pluginName) return showToast('Selecione um plugin', 'warning');

            try {
                await api.createConsumerPlugin(consumer.id, pluginName);
                loadConsumerPlugins(consumer.id);
                showToast('Plugin adicionado ao consumer', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) this.ui.closeModal(modal.id);
            });
        });
    }

    setupConsumerTabs() {
        // Main consumer tabs
        document.querySelectorAll('#view-consumer-details .tabs:not(.credential-tabs) .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = (btn as HTMLElement).dataset.target;
                if (!target) return;

                // Update active tab
                document.querySelectorAll('#view-consumer-details .tabs:not(.credential-tabs) .tab-btn').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');

                // Show target content
                document.querySelectorAll('#view-consumer-details .tab-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(target)?.classList.remove('hidden');
            });
        });

        // Credential type tabs
        document.querySelectorAll('.credential-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = (btn as HTMLElement).dataset.type;
                const consumer = getCurrentConsumer();
                if (!type || !consumer) return;

                document.querySelectorAll('.credential-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');

                loadConsumerCredentials(consumer.id, type);
            });
        });

        // Back button
        document.getElementById('backToConsumersBtn')?.addEventListener('click', () => {
            this.loadConsumersView();
        });
    }
}


