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
    handleBatchPlugin,
    handleBatchDelete
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

                if (!view) return;
                const v = view.toUpperCase();

                if (v === 'SERVICES') this.loadServicesView();
                else if (v === 'ROUTES') this.refreshRoutes();
                else if (v === 'CONSUMERS') this.loadConsumersView();
                else if (v === 'UPSTREAMS') this.loadUpstreamsView();
                else if (v === 'CERTIFICATES') this.loadCertificatesView();
                else if (v === 'DASHBOARD') this.loadDashboard();
            });
        });

        // All services button
        document.getElementById('allServicesBtn')?.addEventListener('click', () => {
            this.updateServiceContext(null);
            this.loadServicesView();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            auth.logout();
        });

        // Settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.ui.openModal('settingsModal');
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
        check('loadFileBtn')?.addEventListener('click', () => document.getElementById('routeFileInput')?.click());
        document.getElementById('routeFileInput')?.addEventListener('change', (e) => handleLoadFile(e));

        check('exportRoutesBtn')?.addEventListener('click', () => handleExportRoutes());

        check('batchEditBtn')?.addEventListener('click', () => handleBatchEdit(this.ui));
        check('pluginBatchBtn')?.addEventListener('click', () => handleBatchPlugin(this.ui));

        // Delete Selected
        check('deleteSelectedBtn')?.addEventListener('click', () => handleBatchDelete(this.ui));

        // Search Route
        document.getElementById('routeSearch')?.addEventListener('input', (e) => {
            store.setSearchFilter((e.target as HTMLInputElement).value);
        });

        // Select All Routes
        document.getElementById('selectAllRoutes')?.addEventListener('change', (e) => {
            store.selectAllRoutes((e.target as HTMLInputElement).checked);
        });

        // Consumers
        check('refreshConsumersBtn')?.addEventListener('click', () => this.loadConsumersView());
        check('backToConsumersBtn')?.addEventListener('click', () => this.loadConsumersView());

        // Consumer Search
        document.getElementById('consumerSearch')?.addEventListener('input', (e) => {
            // Basic implementation for consumer search if needed, currently ui.renderConsumers handles it but store might need update
            // Logic in renderConsumers currently reads input value directly.
            // If we want to use store:
            // store.setConsumerSearch(...)
            // For now relies on direct UI filtering in renderConsumers or re-render
            this.loadConsumersView(); // Trigger re-render to apply filter
        });

        // Upstreams/Certs
        check('refreshUpstreamsBtn')?.addEventListener('click', () => this.loadUpstreamsView());
        check('refreshCertificatesBtn')?.addEventListener('click', () => this.loadCertificatesView());

        // Import routes
        document.getElementById('importRoutesBtn')?.addEventListener('click', () => {
            document.getElementById('routeFileInput')?.click();
        });
    }

    setupModalButtons() {
        // Add plugin button (General)
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

        // --- Consumer ACLs ---
        document.getElementById('addAclBtn')?.addEventListener('click', () => {
            this.ui.openModal('aclModal');
        });

        document.getElementById('saveAclBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const modal = document.getElementById('aclModal');
            const group = (document.getElementById('acl_group') as HTMLInputElement)?.value;
            if (!group) return showToast('Grupo é obrigatório', 'warning');

            const aclId = modal?.dataset.aclId; // if present, it's edit

            try {
                if (aclId) {
                    await api.updateConsumerAcl(consumer.id, aclId, group);
                    showToast('ACL atualizada', 'success');
                    delete modal?.dataset.aclId;
                } else {
                    await api.addConsumerAcl(consumer.id, group);
                    showToast('ACL adicionada', 'success');
                }
                loadConsumerAcls(consumer.id);
                this.ui.closeModal('aclModal');
                (document.getElementById('acl_group') as HTMLInputElement).value = '';

            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // --- Consumer Credentials ---
        document.getElementById('addCredentialBtn')?.addEventListener('click', () => {
            const activeTab = document.querySelector('.credential-tabs .tab-btn.active') as HTMLElement;
            const type = activeTab?.dataset.cred || 'basic-auth';
            const modal = document.getElementById('credentialModal');
            if (modal) {
                delete modal.dataset.credId; // clear edit state
                delete modal.dataset.mode;
            }
            this.ui.renderCredentialForm(type);
            this.ui.openModal('credentialModal');
        });

        document.getElementById('saveCredentialBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const activeTab = document.querySelector('.credential-tabs .tab-btn.active') as HTMLElement;
            const type = activeTab?.dataset.cred || 'basic-auth';
            const data = this.ui.getCredentialFormData(type);
            const modal = document.getElementById('credentialModal');
            const credId = modal?.dataset.credId;

            try {
                if (credId) {
                    await api.updateConsumerCredential(consumer.id, type, credId, data);
                    showToast('Credencial atualizada', 'success');
                    delete modal?.dataset.credId;
                } else {
                    await api.createConsumerCredential(consumer.id, type, data);
                    showToast('Credencial adicionada', 'success');
                }

                loadConsumerCredentials(consumer.id, type, this.ui);
                this.ui.closeModal('credentialModal');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // --- Save Consumer Details ---
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

        // --- Consumer Plugins ---
        document.getElementById('addConsumerPluginBtn')?.addEventListener('click', () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            this.ui.openModal('pluginsModal');
            const modal = document.getElementById('pluginsModal');
            if (modal) {
                modal.dataset.entityType = 'consumer';
                modal.dataset.entityId = consumer.id;
                modal.dataset.pluginId = '';
                modal.dataset.mode = ''; // Clear batch mode
            }
            populatePluginSelect();
            // Hide list, show loading/empty initially or just list existing (which is handled by view usually)
            // But here we are just adding.
            const list = document.getElementById('pluginsList');
            if (list) list.style.display = 'none'; // We are adding, not listing
        });

        // --- Settings ---
        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            const url = (document.getElementById('conf_kong_url') as HTMLInputElement).value;
            if (!url) return showToast('URL é obrigatória', 'warning');

            try {
                // await api.updateConnectionConfig(url);
                // Mocking connection test since backend for config might be different or local
                // Assuming we just want to reload or check connection
                const res = await api.getNodeStatus();
                showToast('Conexão realizada com sucesso!', 'success');
                this.ui.closeModal('settingsModal');
            } catch (e: any) {
                showToast('Falha na conexão: ' + e.message, 'error');
            }
        });

        document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
            const current = (document.getElementById('currentPassword') as HTMLInputElement).value;
            const newPass = (document.getElementById('newPassword') as HTMLInputElement).value;
            const confirm = (document.getElementById('confirmPassword') as HTMLInputElement).value;

            if (newPass !== confirm) return showToast('Senhas não conferem', 'warning');

            try {
                await auth.changePassword(current, newPass);
                showToast('Senha alterada com sucesso', 'success');
                (document.getElementById('changePasswordForm') as HTMLFormElement).reset();
                this.ui.closeModal('settingsModal');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal .btn-secondary, .close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // prevent form submit
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
                const type = (btn as HTMLElement).dataset.cred;
                const consumer = getCurrentConsumer();
                if (!type || !consumer) return;

                document.querySelectorAll('.credential-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');

                loadConsumerCredentials(consumer.id, type, this.ui);
            });
        });

        // Back button
        document.getElementById('backToConsumersBtn')?.addEventListener('click', () => {
            this.loadConsumersView();
        });
    }
}


