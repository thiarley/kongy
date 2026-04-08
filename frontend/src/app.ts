/**
 * Main Application Controller
 * Refactored to use modular views
 */
import { auth } from './services/auth';
import { api } from './services/api';
import { i18n } from './services/i18n';
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
        await i18n.init(); // Initialize i18n
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
        const serviceCallbacks = {
            switchView: this.switchView.bind(this),
            updateServiceContext: this.updateServiceContext.bind(this),
            refreshRoutes: this.refreshRoutes.bind(this)
        };

        const viewCallbacks = {
            switchView: this.switchView.bind(this)
        };

        // Bind view callbacks
        bindServiceCallbacks(this.ui, serviceCallbacks);
        bindRouteCallbacks(this.ui);
        bindPluginCallbacks(this.ui);

        // --- Service Actions ---
        document.getElementById('addServiceBtn')?.addEventListener('click', () => {
            handleAddService(this.ui, serviceCallbacks);
        });
        document.getElementById('refreshServicesBtn')?.addEventListener('click', () => {
            this.loadServicesView();
        });

        // --- Route Actions ---
        document.getElementById('refreshRoutesBtn')?.addEventListener('click', () => {
            this.refreshRoutes();
        });
        document.getElementById('addRouteBtn')?.addEventListener('click', () => {
            handleAddRoute(this.ui);
        });
        document.getElementById('exportRoutesBtn')?.addEventListener('click', () => {
            handleExportRoutes();
        });
        document.getElementById('loadFileBtn')?.addEventListener('click', () => {
            document.getElementById('routeFileInput')?.click();
        });
        document.getElementById('routeFileInput')?.addEventListener('change', (e) => {
            handleLoadFile(e);
        });
        document.getElementById('batchEditBtn')?.addEventListener('click', () => {
            handleBatchEdit(this.ui);
        });
        document.getElementById('pluginBatchBtn')?.addEventListener('click', () => {
            handleBatchPlugin(this.ui);
        });
        document.getElementById('deleteSelectedBtn')?.addEventListener('click', () => {
            handleBatchDelete(this.ui);
        });

        // --- Consumer Actions ---
        document.getElementById('refreshConsumersBtn')?.addEventListener('click', () => {
            this.loadConsumersView();
        });
        document.getElementById('addConsumerBtn')?.addEventListener('click', () => {
            handleAddConsumer(this.ui, viewCallbacks);
        });

        // --- Upstream Actions ---
        document.getElementById('refreshUpstreamsBtn')?.addEventListener('click', () => {
            this.loadUpstreamsView();
        });
        document.getElementById('addUpstreamBtn')?.addEventListener('click', () => {
            handleAddUpstream(this.ui, viewCallbacks);
        });

        // --- Certificate Actions ---
        document.getElementById('refreshCertificatesBtn')?.addEventListener('click', () => {
            this.loadCertificatesView();
        });
        document.getElementById('addCertificateBtn')?.addEventListener('click', () => {
            handleAddCertificate(this.ui, viewCallbacks);
        });

        // --- Search ---
        document.getElementById('routeSearch')?.addEventListener('input', (e) => {
            store.setSearchFilter((e.target as HTMLInputElement).value);
        });

        document.getElementById('selectAllRoutes')?.addEventListener('change', (e) => {
            store.selectAllRoutes((e.target as HTMLInputElement).checked);
        });

        // --- Navigation ---
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = (e.currentTarget as HTMLElement).dataset.view;
                if (view) {
                    if (view === 'services') this.loadServicesView();
                    else if (view === 'routes') this.refreshRoutes();
                    else if (view === 'consumers') this.loadConsumersView();
                    else if (view === 'upstreams') this.loadUpstreamsView();
                    else if (view === 'certificates') this.loadCertificatesView();
                    else if (view === 'dashboard') this.loadDashboard();
                    else this.switchView(view);
                }
            });
        });

        // Save plugin config
        document.getElementById('savePluginConfigBtn')?.addEventListener('click', () => {
            handleSavePluginConfig(this.ui);
        });

        // Add target
        document.getElementById('addTargetBtn')?.addEventListener('click', () => {
            handleAddTarget(this.ui);
        });

        // --- Consumer Triggers ---
        this.ui.triggerConsumerDelete = async (consumer: any) => {
            if (await confirmAction(i18n.t('consumers.delete_confirm', { name: consumer.username || consumer.id }))) {
                try {
                    await api.deleteConsumer(consumer.id);
                    this.loadConsumersView();
                    showToast(i18n.t('consumers.delete_success'), 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            }
        };

        this.ui.triggerConsumerDetails = (consumer: any) => {
            loadConsumerDetails(this.ui, consumer, { switchView: this.switchView.bind(this) });
        };

        // --- Consumer ACLs & Credentials ---
        document.getElementById('addAclBtn')?.addEventListener('click', () => {
            this.ui.openModal('aclModal');
        });

        document.getElementById('saveAclBtn')?.addEventListener('click', async () => {
            const consumer = getCurrentConsumer();
            if (!consumer) return;

            const modal = document.getElementById('aclModal');
            const group = (document.getElementById('acl_group') as HTMLInputElement)?.value;
            if (!group) return showToast(i18n.t('errors.group_required'), 'warning');

            const aclId = modal?.dataset.aclId; // if present, it's edit

            try {
                if (aclId) {
                    await api.updateConsumerAcl(consumer.id, aclId, group);
                    showToast(i18n.t('consumers.acls.update_success'), 'success');
                    delete modal?.dataset.aclId;
                } else {
                    await api.addConsumerAcl(consumer.id, group);
                    showToast(i18n.t('consumers.acls.add_success'), 'success');
                }
                loadConsumerAcls(consumer.id);
                this.ui.closeModal('aclModal');
                (document.getElementById('acl_group') as HTMLInputElement).value = '';

            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

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
                    showToast(i18n.t('consumers.credentials.update_success'), 'success');
                    delete modal?.dataset.credId;
                } else {
                    await api.createConsumerCredential(consumer.id, type, data);
                    showToast(i18n.t('consumers.credentials.add_success'), 'success');
                }

                loadConsumerCredentials(consumer.id, type, this.ui);
                this.ui.closeModal('credentialModal');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

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
                showToast(i18n.t('consumers.update_success'), 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

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
            const list = document.getElementById('pluginsList');
            if (list) list.style.display = 'none';
        });

        // --- Generic Plugin Add ---
        document.getElementById('addPluginBtn')?.addEventListener('click', () => {
            handleAddPlugin(this.ui);
        });

        // --- Settings Action ---
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.ui.openModal('settingsModal');
        });

        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            // ... (settings implementation) ...
            const url = (document.getElementById('conf_kong_url') as HTMLInputElement).value;
            if (!url) return showToast(i18n.t('errors.required'), 'warning');

            try {
                const res = await api.getNodeStatus();
                showToast(i18n.t('messages.connection_success'), 'success');
                this.ui.closeModal('settingsModal');
            } catch (e: any) {
                showToast(`${i18n.t('messages.connection_error')}: ${e.message}`, 'error');
            }
        });

        document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
            const current = (document.getElementById('currentPassword') as HTMLInputElement).value;
            const newPass = (document.getElementById('newPassword') as HTMLInputElement).value;
            const confirm = (document.getElementById('confirmPassword') as HTMLInputElement).value;

            if (newPass !== confirm) return showToast(i18n.t('auth.passwords_do_not_match'), 'warning');

            try {
                await auth.changePassword(current, newPass);
                showToast(i18n.t('auth.change_password_success'), 'success');
                (document.getElementById('changePasswordForm') as HTMLFormElement).reset();
                this.ui.closeModal('settingsModal');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            auth.logout();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal .btn-secondary, .close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = btn.closest('.modal');
                if (modal) this.ui.closeModal(modal.id);
            });
        });

        this.setupConsumerTabs();
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

