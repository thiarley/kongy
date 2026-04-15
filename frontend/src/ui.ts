import { store } from './store';
import {
    formatDate,
    escapeHtml,
    getPluginIcon,
    truncate,
    parseCommaSeparated,
    joinWithComma,
    $,
    renderIncrementally
} from './utils';
import { Route, Consumer, Plugin, Service } from './types/kong';
import { i18n } from './services/i18n';

export class UI {
    private api: any;
    private els: Record<string, HTMLElement | null>;

    public triggerServiceSelect: Function = () => { };
    public triggerEdit: Function = () => { };
    public triggerDelete: Function = () => { };
    public triggerConsumerDelete: Function = () => { };
    public triggerConsumerCredentials: Function = () => { };
    public triggerConsumerDetails: Function = () => { };
    public triggerPlugins: Function = () => { };
    public triggerServiceEdit: Function = () => { };
    public triggerServicePlugins: Function = () => { };
    public triggerServiceDelete: Function = () => { };

    constructor(api: any) {
        this.api = api;
        // Elements initialized in init() to ensure DOM is ready
        this.els = {
            routesTable: null,
            consumersTable: null,
            stats: null,
            batchBtn: null,
            syncBtn: null,
            deleteBtn: null,
            pluginBtn: null,
            searchInput: null,
            selectAll: null,
            serviceList: null,
            serviceBadge: null,
            serviceMeta: null,
            serviceEditBtn: null,
            routesContent: null,
            consumersContent: null
        };
    }

    init() {
        this.els = {
            routesTable: document.querySelector('#routesTable tbody'),
            consumersTable: document.querySelector('#consumersTable tbody'),
            stats: document.getElementById('routeStats'),
            batchBtn: document.getElementById('batchEditBtn'),
            deleteBtn: document.getElementById('deleteSelectedBtn'),
            pluginBtn: document.getElementById('pluginBatchBtn'),
            searchInput: document.getElementById('consumerSearch'),
            selectAll: document.getElementById('selectAllRoutes'),
            serviceList: document.getElementById('serviceList'),
            serviceBadge: document.getElementById('currentServiceBadge'),
            serviceMeta: document.getElementById('currentServiceMeta'),
            serviceEditBtn: document.getElementById('editServiceContextBtn'),
            routesContent: document.getElementById('view-routes-content'),
            consumersContent: document.getElementById('view-consumers-content')
        };

        // Subscribe to store once DOM is ready
        store.subscribe((state: any) => this.render(state));

        // Initialize tabs and modals
        this.initTabs();
    }

    render(state: any) {
        this.renderRoutes(store.filteredRoutes, state.selectedRoutes);
        this.renderStats();
        this.updateToolbar(state);
    }

    renderServices(services: any[], currentId: string) {
        const container = this.els.serviceList;
        if (!container) return;

        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-database" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p class="text-muted">${i18n.t('services.empty_state')}</p>
                </div>
            `;
            return;
        }

        renderIncrementally({
            key: 'services',
            container,
            items: services,
            batchSize: 24,
            renderItem: (svc: any) => {
                const el = document.createElement('div');
                el.className = `service-card ${svc.id === currentId ? 'active' : ''}`;

                const protocol = svc.protocol || 'http';
                const host = svc.host || '-';
                const port = svc.port ? `:${svc.port}` : '';
                const path = svc.path ? svc.path : '';

                el.innerHTML = `
                <div class="svc-header">
                    <div class="svc-name">${escapeHtml(svc.name || i18n.t('actions.new'))}</div>
                    <div class="svc-actions">
                        <button class="btn-icon svc-plugins" title="${i18n.t('nav.plugins')}" onclick="event.stopPropagation()">
                            <i class="ph ph-plugs"></i>
                        </button>
                        <button class="btn-icon svc-edit" title="${i18n.t('actions.edit')}" onclick="event.stopPropagation()">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn-icon svc-delete text-danger" title="${i18n.t('actions.delete')}" onclick="event.stopPropagation()">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="svc-id font-monospace">${svc.id}</div>
                <div class="svc-meta">
                    <span class="badge badge-secondary">${protocol}</span>
                    <span class="badge badge-outline">${host}${port}${path}</span>
                </div>
            `;

                el.onclick = () => this.triggerServiceSelect(svc);

                (el.querySelector('.svc-plugins') as HTMLElement).onclick = (e) => {
                    e.stopPropagation();
                    this.triggerServicePlugins(svc);
                };
                (el.querySelector('.svc-edit') as HTMLElement).onclick = (e) => {
                    e.stopPropagation();
                    this.triggerServiceEdit(svc);
                };
                (el.querySelector('.svc-delete') as HTMLElement).onclick = (e) => {
                    e.stopPropagation();
                    this.triggerServiceDelete(svc);
                };

                return el;
            }
        });
    }

    renderRoutes(routes: Route[], selectedSet: Set<string>) {
        // Robustness: Re-query in case of DOM changes
        const tbody = document.querySelector('#routesTable tbody') || this.els.routesTable;
        if (!tbody) {
            console.error('Routes table body not found');
            return;
        }

        try {
            if (routes.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted p-4">
                            <i class="ph ph-path" style="font-size: 2rem; opacity: 0.5;"></i>
                            <p>${i18n.t('routes.empty_state')}</p>
                        </td>
                    </tr>
                `;
                return;
            }

            renderIncrementally({
                key: 'routes',
                container: tbody as HTMLElement,
                items: routes,
                batchSize: 40,
                renderItem: (route: Route) => {
                const tr = document.createElement('tr');
                const isSelected = !!route.id && selectedSet.has(route.id);
                if (isSelected) tr.classList.add('selected-row');

                const raw = route.raw || route;
                const name = raw.name || `<i class="text-muted">(sem nome)</i>`;
                const paths = (raw.paths || []).join(', ') || '-';
                const tags = raw.tags || [];

                const sourceBadge = route.source === 'remote'
                    ? `<span class="badge badge-success">Kong</span>`
                    : `<span class="badge badge-warning">Local</span>`;

                const routePlugins = store.getRoutePlugins(route.id);
                const pluginIcons = this.renderPluginIndicators(routePlugins);

                tr.innerHTML = `
                <td>
                    <input type="checkbox" class="route-check" ${isSelected ? 'checked' : ''}>
                </td>
                <td>
                    <div class="fw-bold text-white">${name}</div>
                    <div class="text-muted small font-monospace" title="${route.id || ''}">${truncate(route.id || '', 20)}</div>
                </td>
                <td>
                    <div class="route-methods mb-1">
                        ${this.renderMethodBadges(raw.methods || [])}
                    </div>
                    <div class="route-path text-truncate" style="max-width: 250px;" title="${escapeHtml(paths)}">${escapeHtml(paths)}</div>
                </td>
                <td class="text-center">
                    <span class="option-indicator ${raw.preserve_host ? 'active' : ''}" title="${i18n.t('routes.preserve_host')}">
                        ${raw.preserve_host ? '✅' : '⬜'}
                    </span>
                </td>
                <td class="text-center">
                    <span class="option-indicator ${raw.strip_path ? 'active' : ''}" title="${i18n.t('routes.strip_path')}">
                        ${raw.strip_path !== false ? '✅' : '⬜'}
                    </span>
                </td>
                <td>
                    <div class="route-tags">
                        ${tags.slice(0, 3).map((t: string) =>
                    `<span class="badge badge-neutral">${escapeHtml(t)}</span>`
                ).join('')}
                        ${tags.length > 3 ? `<span class="badge badge-neutral">+${tags.length - 3}</span>` : ''}
                    </div>
                    ${pluginIcons}
                </td>
                <td>${sourceBadge}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon action-edit" title="${i18n.t('actions.edit')}">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn-icon action-plugins" title="${i18n.t('actions.manage_plugins')}">
                            <i class="ph ph-plug"></i>
                        </button>
                        <button class="btn-icon action-copy" title="${i18n.t('actions.copy_json')}">
                            <i class="ph ph-copy"></i>
                        </button>
                        <button class="btn-icon action-del text-danger" title="${i18n.t('actions.delete')}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            `;

                (tr.querySelector('.route-check') as HTMLElement).onchange = (e: any) => {
                    if (!route.id) return;
                    store.selectRoute(route.id, e.target.checked);
                };
                (tr.querySelector('.action-edit') as HTMLElement).onclick = () => this.triggerEdit(route);
                (tr.querySelector('.action-plugins') as HTMLElement).onclick = () => this.triggerPlugins(route);
                (tr.querySelector('.action-del') as HTMLElement).onclick = () => this.triggerDelete(route);
                (tr.querySelector('.action-copy') as HTMLElement).onclick = () => {
                    navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
                    import('./utils').then(({ showToast }) => showToast(i18n.t('messages.copied'), 'success'));
                };

                return tr;
                },
                onComplete: () => this.syncSelectAllCheckbox(routes, selectedSet)
            });
        } catch (e: any) {
            console.error('Error rendering routes', e);
        }
    }

    syncSelectAllCheckbox(routes: Route[], selectedSet: Set<string>) {
        const selectAll = this.els.selectAll as HTMLInputElement | null;
        if (!selectAll) return;

        const routeIds = routes.map(route => route.id).filter(Boolean) as string[];
        const selectedVisibleCount = routeIds.filter(routeId => selectedSet.has(routeId)).length;

        selectAll.checked = routeIds.length > 0 && selectedVisibleCount === routeIds.length;
        selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < routeIds.length;
    }

    renderMethodBadges(methods: string[]) {
        if (!methods || methods.length === 0) {
            return '<span class="badge badge-outline">ANY</span>';
        }

        const colors: Record<string, string> = {
            'GET': 'badge-get',
            'POST': 'badge-post',
            'PUT': 'badge-put',
            'DELETE': 'badge-delete',
            'PATCH': 'badge-patch'
        };

        return methods.slice(0, 4).map(m =>
            `<span class="badge ${colors[m] || 'badge-secondary'}">${m}</span>`
        ).join('') + (methods.length > 4 ? `<span class="badge badge-neutral">+${methods.length - 4}</span>` : '');
    }

    renderPluginIndicators(plugins: Plugin[]) {
        if (!plugins || plugins.length === 0) return '';

        const icons = plugins
            .filter(p => p.enabled)
            .slice(0, 5)
            .map(p => `<span class="plugin-icon" title="${p.name}">${getPluginIcon(p.name)}</span>`)
            .join('');

        const extra = plugins.length > 5 ? `<span class="plugin-count">+${plugins.length - 5}</span>` : '';

        return `<div class="plugin-indicators">${icons}${extra}</div>`;
    }

    renderConsumers(consumers: Consumer[]) {
        const tbody = this.els.consumersTable;
        if (!tbody) return;

        const term = ((this.els.searchInput as HTMLInputElement)?.value || '').toLowerCase();
        const filtered = consumers.filter(c =>
            (c.username || '').toLowerCase().includes(term) ||
            (c.custom_id || '').toLowerCase().includes(term)
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted p-4">
                        <i class="ph ph-users" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p>${i18n.t('consumers.empty_state')}</p>
                    </td>
                </tr>
            `;
            return;
        }

        renderIncrementally({
            key: 'consumers',
            container: tbody,
            items: filtered,
            batchSize: 40,
            renderItem: (c: Consumer) => {
            const tr = document.createElement('tr');
            const created = formatDate(c.created_at);
            const tags = c.tags || [];

            tr.innerHTML = `
                <td class="font-monospace small text-muted">${c.id.substring(0, 8)}...</td>
                <td class="fw-bold text-white">${escapeHtml(c.username || '-')}</td>
                <td>${escapeHtml(c.custom_id || '-')}</td>
                <td>
                    ${tags.slice(0, 3).map(t => `<span class="badge badge-neutral">${escapeHtml(t)}</span>`).join('')}
                    ${tags.length > 3 ? `<span class="badge badge-neutral">+${tags.length - 3}</span>` : ''}
                </td>
                <td>${created}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon action-details" title="${i18n.t('actions.details')}">
                            <i class="ph ph-gear"></i>
                        </button>
                        <button class="btn-icon action-del text-danger" title="${i18n.t('actions.delete')}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            (tr.querySelector('.action-details') as HTMLElement).onclick = () => this.triggerConsumerDetails(c);
            (tr.querySelector('.action-del') as HTMLElement).onclick = () => this.triggerConsumerDelete(c);

            return tr;
            }
        });
    }

    updateSelectedService(service: Service | null) {
        const sidebarContainer = document.getElementById('sidebarServiceContext');
        const badge = this.els.serviceBadge;
        const metaEl = this.els.serviceMeta;
        const editBtn = this.els.serviceEditBtn;

        if (!service) {
            if (sidebarContainer) sidebarContainer.classList.add('hidden');
            if (badge) badge.textContent = '...';
            if (metaEl) metaEl.textContent = '';
            if (editBtn) editBtn.onclick = null;
            return;
        }

        const protocol = service.protocol || 'http';
        const host = service.host || '-';
        const port = service.port ? `:${service.port}` : '';
        const path = service.path || '';
        const meta = `${protocol}://${host}${port}${path}`;

        if (sidebarContainer) sidebarContainer.classList.remove('hidden');
        if (badge) badge.textContent = service.name || service.id;
        if (metaEl) metaEl.textContent = meta;
        if (editBtn) {
            editBtn.onclick = () => this.triggerServiceEdit(service);
        }
    }

    renderStats() {
        if (!this.els.stats) return;

        const stats = store.stats;
        this.els.stats.innerHTML = `
            <span class="stat-number">${stats.total}</span> ${i18n.t('routes.title')}
            <span class="stat-divider">|</span>
            <span class="stat-info">${stats.withPlugins}</span> ${i18n.t('routes.with_plugins')}
        `;
    }

    updateToolbar(state: any) {
        const count = state.selectedRoutes.size;
        const hasSelection = count > 0;

        const ids = ['deleteSelectedBtn', 'batchEditBtn', 'pluginBatchBtn', 'exportRoutesBtn'];
        ids.forEach(id => {
            const el = document.getElementById(id) as HTMLButtonElement;
            if (el) el.disabled = !hasSelection;
        });

        if (this.els.deleteBtn) {
            this.els.deleteBtn.innerHTML = `<i class="ph ph-trash"></i> ${count > 0 ? `(${count})` : ''}`;
        }
    }

    openModal(id: string) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hidden');
            const firstInput = el.querySelector('input:not([type="hidden"]), select, textarea') as HTMLElement;
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
    }

    closeModal(id: string) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            if (id === 'editModal') {
                el.classList.remove('mode-batch');
                const btn = document.getElementById('saveRouteBtn') as HTMLElement;
                if (btn) btn.dataset.mode = '';
                const nameInput = document.getElementById('input_name') as HTMLInputElement;
                if (nameInput) {
                    nameInput.disabled = false;
                    nameInput.placeholder = 'nome-da-rota';
                }
                el.querySelectorAll('.batch-field-check').forEach((cb: any) => cb.checked = false);
            }
            if (id === 'serviceModal') {
                this.clearServiceForm();
            }
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('mode-batch');
        });

        const nameInput = document.getElementById('input_name') as HTMLInputElement;
        if (nameInput) {
            nameInput.disabled = false;
            nameInput.placeholder = 'nome-da-rota';
        }
    }

    initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const parent = btn.closest('.tabs');
                if (!parent) return;

                // Remove active state from all siblings
                parent.querySelectorAll('.tab-btn').forEach((b: any) => b.classList.remove('active'));
                btn.classList.add('active');

                // Determine target ID - support both data-tab and data-target
                let targetId = (btn as HTMLElement).dataset.target || '';
                if (!targetId) {
                    const tabName = (btn as HTMLElement).dataset.tab;
                    if (tabName) targetId = `tab-${tabName}`;
                }

                if (!targetId) return;

                // Find the content container - can be modal or a sibling container
                const modal = btn.closest('.modal-content');
                const viewSection = btn.closest('.view-section');
                const container = modal || viewSection || document;

                // Hide all tab-content within the container
                container.querySelectorAll('.tab-content').forEach((c: any) => c.classList.add('hidden'));

                // Show the target
                const target = document.getElementById(targetId);
                if (target) target.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = (e.target as HTMLElement).closest('.modal');
                if (modal) modal.classList.add('hidden');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    renderPluginForm(schema: any, containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (!schema || !schema.fields) {
            container.innerHTML = `
                <div class="text-muted mb-2">Sem esquema disponível. Use JSON:</div>
                <textarea id="plg_json_blob" class="form-control plugin-field" 
                    style="height:150px; font-family:monospace;" 
                    placeholder='{"key": "value"}'></textarea>
            `;
            return;
        }

        let html = '';

        schema.fields.forEach((fieldObj: any) => {
            const keys = Object.keys(fieldObj);
            if (keys.length === 0) return;

            const fieldName = keys[0];
            const meta = fieldObj[fieldName];

            if (fieldName === 'consumer' || fieldName === 'route' || fieldName === 'service') {
                return;
            }

            const fieldId = `plg_${fieldName}`;
            const required = meta.required ? '<span class="text-danger">*</span>' : '';
            const defaultVal = meta.default !== undefined ? meta.default : '';
            const help = meta.default !== undefined
                ? `<small class="text-muted">Padrão: ${JSON.stringify(meta.default)}</small>`
                : '';

            if (meta.type === 'boolean') {
                html += `
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="${fieldId}" class="plugin-field" 
                            data-key="${fieldName}" ${meta.default === true ? 'checked' : ''}>
                        <span>${fieldName} ${required}</span>
                    </label>
                    ${help}
                </div>`;
            } else if (meta.type === 'number' || meta.type === 'integer') {
                html += `
                <div class="form-group">
                    <label>${fieldName} ${required}</label>
                    <input type="number" id="${fieldId}" class="form-control plugin-field" 
                        data-key="${fieldName}" placeholder="${defaultVal}">
                    ${help}
                </div>`;
            } else if (meta.type === 'set' || meta.type === 'array') {
                html += `
                <div class="form-group">
                    <label>${fieldName} (lista) ${required}</label>
                    <input type="text" id="${fieldId}" class="form-control plugin-field" 
                        data-key="${fieldName}" placeholder="valor1, valor2...">
                    ${help}
                </div>`;
            } else if (meta.one_of) {
                const options = meta.one_of.map((o: any) =>
                    `<option value="${o}" ${o === defaultVal ? 'selected' : ''}>${o}</option>`
                ).join('');
                html += `
                <div class="form-group">
                    <label>${fieldName} ${required}</label>
                    <select id="${fieldId}" class="form-control plugin-field" data-key="${fieldName}">
                        ${options}
                    </select>
                    ${help}
                </div>`;
            } else {
                html += `
                <div class="form-group">
                    <label>${fieldName} ${required}</label>
                    <input type="text" id="${fieldId}" class="form-control plugin-field" 
                        data-key="${fieldName}" placeholder="${defaultVal}">
                    ${help}
                </div>`;
            }
        });

        container.innerHTML = html || '<p class="text-muted">Nenhuma configuração necessária</p>';
    }

    populateRouteForm(route: Route) {
        const raw = route.raw || route;

        const nameInput = document.getElementById('input_name') as HTMLInputElement;
        const pathsInput = document.getElementById('input_paths') as HTMLInputElement;
        const tagsInput = document.getElementById('input_tags') as HTMLInputElement;
        const stripPath = document.getElementById('input_strip_path') as HTMLInputElement;
        const preserveHost = document.getElementById('input_preserve_host') as HTMLInputElement;
        const jsonEditor = document.getElementById('jsonEditor') as HTMLTextAreaElement;

        if (nameInput) nameInput.value = raw.name || '';
        if (pathsInput) pathsInput.value = joinWithComma(raw.paths);
        if (tagsInput) tagsInput.value = joinWithComma(raw.tags);
        if (stripPath) stripPath.checked = raw.strip_path !== false;
        if (preserveHost) preserveHost.checked = raw.preserve_host === true;
        if (jsonEditor) jsonEditor.value = JSON.stringify(raw, null, 4);

        const methods = raw.methods || [];
        document.querySelectorAll('#methodChecks input').forEach((cb: any) => {
            cb.checked = methods.includes(cb.value);
        });
    }

    getRouteFormData() {
        const nameInput = document.getElementById('input_name') as HTMLInputElement;
        const pathsInput = document.getElementById('input_paths') as HTMLInputElement;
        const tagsInput = document.getElementById('input_tags') as HTMLInputElement;
        const stripPath = document.getElementById('input_strip_path') as HTMLInputElement;
        const preserveHost = document.getElementById('input_preserve_host') as HTMLInputElement;

        const data: Partial<Route> = {};

        if (nameInput?.value) data.name = nameInput.value.trim();
        if (pathsInput?.value) data.paths = parseCommaSeparated(pathsInput.value);
        if (tagsInput?.value) data.tags = parseCommaSeparated(tagsInput.value);

        data.strip_path = stripPath?.checked ?? true;
        data.preserve_host = preserveHost?.checked ?? false;

        const methods: string[] = [];
        document.querySelectorAll('#methodChecks input:checked').forEach((cb: any) => {
            methods.push(cb.value);
        });
        if (methods.length > 0) data.methods = methods;

        return data;
    }

    clearRouteForm() {
        const inputs = ['input_name', 'input_paths', 'input_tags'];
        inputs.forEach(id => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el) el.value = '';
        });

        const stripPath = document.getElementById('input_strip_path') as HTMLInputElement;
        const preserveHost = document.getElementById('input_preserve_host') as HTMLInputElement;
        if (stripPath) stripPath.checked = true;
        if (preserveHost) preserveHost.checked = false;

        document.querySelectorAll('#methodChecks input').forEach((cb: any) => cb.checked = false);

        const jsonEditor = document.getElementById('jsonEditor') as HTMLTextAreaElement;
        if (jsonEditor) jsonEditor.value = '{}';
    }

    clearServiceForm() {
        const nameInput = document.getElementById('svc_name') as HTMLInputElement;
        const hostInput = document.getElementById('svc_host') as HTMLInputElement;
        const title = document.getElementById('serviceModalTitle');

        if (nameInput) nameInput.value = '';
        if (hostInput) hostInput.value = '';
        if (title) {
            title.innerHTML = `<span data-i18n="actions.new">Novo</span> <span data-i18n="services.entity">Serviço</span>`;
        }
    }

    setBatchMode(active: boolean, count: number = 0) {
        const modal = document.getElementById('editModal');
        if (!modal) return;

        // Toggle batch-only elements
        modal.querySelectorAll('.batch-only').forEach(el => {
            if (active) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });

        // Toggle Name field (disabled in batch)
        const nameInput = document.getElementById('input_name') as HTMLInputElement;
        if (nameInput) nameInput.disabled = active;

        // Update Title and Button
        const title = document.getElementById('editModalTitle');
        const saveBtn = document.getElementById('saveRouteBtn');

        if (title) {
            title.innerText = active
                ? `${i18n.t('actions.edit')} ${count} ${i18n.t('routes.title')} (${i18n.t('plugins.apply_batch')})`
                : `${i18n.t('actions.edit')} ${i18n.t('routes.title')}`; // Singular technically but Routes View title is plural. Using 'routes.title' (Rotas) might be weird "Edit Rotas". 
            // Let's stick to "Editor de Rota" or something generic? 
            // Or "Edit Route" if I had singular key.
            // I'll use hardcoded "Editar Rota" -> i18n.t('actions.edit') + ' ' + 'Rota' (no singular key) or just assume context.
            // Let's use `${i18n.t('actions.edit')} Rota` for now as I missed singular route.
        }

        // Actually, let's just use "Rota" literal or add it. I'll use "Rota" literal to avoid breaking if key missing.
        // Wait, I can't add key now easily without risk.
        if (title) {
            title.innerText = active
                ? `${i18n.t('actions.edit')} ${count} Rotas`
                : `${i18n.t('actions.edit')} Rota`;
        }

        if (saveBtn) {
            saveBtn.textContent = active ? i18n.t('plugins.apply_batch') : i18n.t('actions.save');
        }

        // Handle batch field disabling
        const batchChecks = modal.querySelectorAll('.batch-field-check') as NodeListOf<HTMLInputElement>;
        batchChecks.forEach(check => {
            const target = check.dataset.target;
            if (!target) return;

            // Find the corresponding input(s) in the same form-group-box
            const formGroup = check.closest('.form-group-box');
            if (formGroup) {
                const inputs = formGroup.querySelectorAll('input.input-target, .input-target input') as NodeListOf<HTMLInputElement>;
                inputs.forEach(inp => {
                    inp.disabled = active && !check.checked;
                });
            }

            // Attach listener for toggling
            check.onchange = () => {
                if (formGroup) {
                    const inputs = formGroup.querySelectorAll('input.input-target, .input-target input') as NodeListOf<HTMLInputElement>;
                    inputs.forEach(inp => {
                        inp.disabled = !check.checked;
                    });
                }
            };
        });

        // If leaving batch mode, re-enable all fields
        if (!active) {
            modal.querySelectorAll('input.input-target, .input-target input').forEach((inp: any) => {
                inp.disabled = false;
            });
        }
    }

    renderRoutePluginsList(plugins: Plugin[], route: Route | any, callbacks: any = {}) {
        const container = document.getElementById('pluginsList');
        if (!container) return;

        // Ensure visible (might have been hidden by batch mode)
        container.style.display = '';

        const entityNameEl = document.getElementById('pluginsEntityName');
        if (entityNameEl) {
            entityNameEl.textContent = route.name || route.username || route.id;
        }

        if (!plugins || plugins.length === 0) {
            container.innerHTML = `
                <div class="plugin-empty-state">
                    <i class="ph ph-plug"></i>
                    <p>${i18n.t('plugins.no_plugins')}</p>
                    <span class="text-muted small">${i18n.t('plugins.select_placeholder')}</span>
                </div>
            `;
            return;
        }

        container.innerHTML = plugins.map(plugin => {
            const icon = getPluginIcon(plugin.name);
            const isEnabled = plugin.enabled !== false;
            const statusClass = isEnabled ? 'plugin-enabled' : 'plugin-disabled';
            const statusBadge = isEnabled
                ? `<span class="badge badge-success">${i18n.t('plugins.enabled')}</span>`
                : `<span class="badge badge-danger">${i18n.t('plugins.disabled')}</span>`;

            return `
                <div class="plugin-item ${statusClass}" data-plugin-id="${plugin.id}">
                    <div class="plugin-item-info">
                        <span class="plugin-item-icon">${icon}</span>
                        <div>
                            <div class="plugin-item-name">${escapeHtml(plugin.name)}</div>
                            <div class="plugin-item-id">${plugin.id}</div>
                        </div>
                    </div>
                    <div class="plugin-item-status">
                        ${statusBadge}
                        <label class="toggle-switch" title="${isEnabled ? i18n.t('actions.disconnect') : i18n.t('actions.connect')}">
                            <input type="checkbox" class="plugin-toggle" data-id="${plugin.id}" ${isEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="plugin-item-actions">
                        <button class="btn-icon plugin-edit-btn" data-id="${plugin.id}" title="${i18n.t('actions.edit')}">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn-icon text-danger plugin-delete-btn" data-id="${plugin.id}" title="${i18n.t('actions.delete')}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.plugin-toggle').forEach((toggle: any) => {
            toggle.addEventListener('change', (e: any) => {
                if (callbacks.onToggle) {
                    callbacks.onToggle(e.target.dataset.id, e.target.checked);
                }
            });
        });

        container.querySelectorAll('.plugin-edit-btn').forEach((btn: any) => {
            btn.addEventListener('click', () => {
                const pluginId = btn.dataset.id;
                const plugin = plugins.find(p => p.id === pluginId);
                if (callbacks.onEdit && plugin) {
                    callbacks.onEdit(plugin);
                }
            });
        });

        container.querySelectorAll('.plugin-delete-btn').forEach((btn: any) => {
            btn.addEventListener('click', () => {
                if (callbacks.onDelete) {
                    callbacks.onDelete(btn.dataset.id);
                }
            });
        });
    }

    renderPluginConfigForm(plugin: Plugin | null, schema: any, pluginName: string) {
        const container = document.getElementById('pluginConfigForm');
        const nameEl = document.getElementById('pluginConfigName');
        const titleEl = document.getElementById('pluginConfigTitle');

        if (nameEl) nameEl.textContent = pluginName;
        if (titleEl) titleEl.textContent = plugin
            ? `${i18n.t('actions.edit')} Plugin`
            : `${i18n.t('actions.create')} Plugin`;

        if (!container) return;

        if (!schema || !schema.fields) {
            container.innerHTML = `
                <div class="plugin-config-group">
                    <label>${i18n.t('plugins.config') || 'Configuração JSON'}</label>
                    <textarea id="pluginConfigJson" class="form-control font-monospace" 
                        style="height: 200px;">${JSON.stringify(plugin?.config || {}, null, 2)}</textarea>
                </div>
            `;
            return;
        }

        let html = '';
        const configFields = schema.fields.find((f: any) => f.config)?.config?.fields || schema.fields || [];

        configFields.forEach((fieldObj: any) => {
            const [fieldName, meta] = Object.entries(fieldObj)[0] as [string, any] || [null, null];
            if (!fieldName || !meta) return;
            if (meta.auto === true) return;
            if (['consumer', 'route', 'service', 'protocols', 'enabled', 'id', 'created_at', 'run_on', 'ordering'].includes(fieldName)) return;

            const currentValue = plugin?.config?.[fieldName] ?? meta.default ?? '';
            const required = meta.required ? '<span class="text-danger">*</span>' : '';

            html += `<div class="plugin-config-group">`;
            html += `<label>${escapeHtml(fieldName)} ${required}</label>`;

            if (meta.type === 'boolean') {
                html += `
                    <label class="checkbox-label">
                        <input type="checkbox" class="plugin-config-field" 
                            data-field="${fieldName}" 
                            data-type="boolean"
                            ${currentValue ? 'checked' : ''}>
                        ${meta.description || i18n.t('plugins.enabled')}
                    </label>
                `;
            } else if (meta.type === 'number' || meta.type === 'integer') {
                html += `
                    <input type="number" class="form-control plugin-config-field" 
                        data-field="${fieldName}" 
                        data-type="number"
                        value="${currentValue}">
                `;
            } else if (meta.type === 'array' || meta.type === 'set') {
                html += `
                    <input type="text" class="form-control plugin-config-field" 
                        data-field="${fieldName}" 
                        data-type="${meta.type}"
                        value="${Array.isArray(currentValue) ? currentValue.join(', ') : currentValue}"
                        placeholder="valor1, valor2...">
                    <small class="text-muted" style="display: block; margin-top: 4px; font-size: 0.75rem;">
                        <i class="ph ph-info"></i> ${i18n.t('plugins.list_hint') || 'Separe os valores por vírgula'}
                    </small>
                `;
            } else {
                html += `
                    <input type="text" class="form-control plugin-config-field" 
                        data-field="${fieldName}" 
                        value="${escapeHtml(currentValue)}">
                `;
            }
            html += `</div>`;
        });

        container.innerHTML = html;
    }


    renderCredentialForm(type: string) {
        const container = document.getElementById('credentialFields');
        const title = document.getElementById('credentialModalTitle');
        if (title) title.innerText = `${i18n.t('actions.new')} ${i18n.t('consumers.credentials.title')} (${type})`;

        if (!container) return;
        container.innerHTML = '';

        let html = '';
        if (type === 'basic-auth') {
            html = `
                <div class="form-group">
                    <label>${i18n.t('consumers.username')}</label>
                    <input type="text" id="cred_username" class="form-control">
                </div>
                <div class="form-group">
                    <label>${i18n.t('auth.password')}</label>
                    <input type="password" id="cred_password" class="form-control">
                </div>
             `;
        } else if (type === 'key-auth') {
            html = `
                <div class="form-group">
                    <label>Key (Opcional)</label>
                    <input type="text" id="cred_key" class="form-control" placeholder="">
                </div>
             `;
        } else if (type === 'jwt') {
            html = `
                <div class="form-group"><label>Key</label><input type="text" id="cred_key" class="form-control"></div>
                <div class="form-group"><label>Algorithm</label><select id="cred_algorithm" class="form-control"><option>HS256</option><option>RS256</option></select></div>
                <div class="form-group"><label>RSA Public Key (se RS256)</label><textarea id="cred_rsa_public_key" class="form-control"></textarea></div>
                <div class="form-group"><label>Secret (se HS256)</label><input type="text" id="cred_secret" class="form-control"></div>
             `;
        } else if (type === 'hmac-auth') {
            html = `
                <div class="form-group"><label>${i18n.t('consumers.username')}</label><input type="text" id="cred_username" class="form-control"></div>
                <div class="form-group"><label>Secret</label><input type="text" id="cred_secret" class="form-control"></div>
            `;
        } else if (type === 'oauth2') {
            html = `
                <div class="form-group"><label>${i18n.t('services.name')}</label><input type="text" id="cred_name" class="form-control"></div>
                <div class="form-group"><label>Client ID</label><input type="text" id="cred_client_id" class="form-control"></div>
                <div class="form-group"><label>Client Secret</label><input type="text" id="cred_client_secret" class="form-control"></div>
                <div class="form-group"><label>Redirect URIs</label><input type="text" id="cred_redirect_uris" class="form-control" placeholder="comma separated"></div>
             `;
        }

        container.innerHTML = html;
    }

    getCredentialFormData(type: string) {
        const data: any = {};
        if (type === 'basic-auth') {
            data.username = (document.getElementById('cred_username') as HTMLInputElement).value;
            data.password = (document.getElementById('cred_password') as HTMLInputElement).value;
        } else if (type === 'key-auth') {
            const k = (document.getElementById('cred_key') as HTMLInputElement).value;
            if (k) data.key = k;
        } else if (type === 'jwt') {
            data.key = (document.getElementById('cred_key') as HTMLInputElement).value;
            data.algorithm = (document.getElementById('cred_algorithm') as HTMLInputElement).value;
            const rsa = (document.getElementById('cred_rsa_public_key') as HTMLInputElement).value;
            const sec = (document.getElementById('cred_secret') as HTMLInputElement).value;
            if (rsa) data.rsa_public_key = rsa;
            if (sec) data.secret = sec;
        } else if (type === 'hmac-auth') {
            data.username = (document.getElementById('cred_username') as HTMLInputElement).value;
            const s = (document.getElementById('cred_secret') as HTMLInputElement).value;
            if (s) data.secret = s;
        } else if (type === 'oauth2') {
            data.name = (document.getElementById('cred_name') as HTMLInputElement).value;
            const cid = (document.getElementById('cred_client_id') as HTMLInputElement).value;
            const csc = (document.getElementById('cred_client_secret') as HTMLInputElement).value;
            const uris = (document.getElementById('cred_redirect_uris') as HTMLInputElement).value;
            if (cid) data.client_id = cid;
            if (csc) data.client_secret = csc;
            if (uris) data.redirect_uris = uris.split(',').map(u => u.trim());
        }
        return data;
    }

    populateCredentialForm(type: string, data: any) {
        if (!data) return;

        if (type === 'basic-auth') {
            const u = document.getElementById('cred_username') as HTMLInputElement;
            const p = document.getElementById('cred_password') as HTMLInputElement;
            if (u) u.value = data.username || '';
            if (p) p.value = data.password || '';
        } else if (type === 'key-auth') {
            const k = document.getElementById('cred_key') as HTMLInputElement;
            if (k) k.value = data.key || '';
        } else if (type === 'jwt') {
            const k = document.getElementById('cred_key') as HTMLInputElement;
            const alg = document.getElementById('cred_algorithm') as HTMLInputElement;
            const rsa = document.getElementById('cred_rsa_public_key') as HTMLInputElement;
            const sec = document.getElementById('cred_secret') as HTMLInputElement;

            if (k) k.value = data.key || '';
            if (alg) alg.value = data.algorithm || 'HS256';
            if (rsa) rsa.value = data.rsa_public_key || '';
            if (sec) sec.value = data.secret || '';
        } else if (type === 'hmac-auth') {
            const u = document.getElementById('cred_username') as HTMLInputElement;
            const s = document.getElementById('cred_secret') as HTMLInputElement;
            if (u) u.value = data.username || '';
            if (s) s.value = data.secret || '';
        } else if (type === 'oauth2') {
            const n = document.getElementById('cred_name') as HTMLInputElement;
            const cid = document.getElementById('cred_client_id') as HTMLInputElement;
            const csc = document.getElementById('cred_client_secret') as HTMLInputElement;
            const uris = document.getElementById('cred_redirect_uris') as HTMLInputElement;

            if (n) n.value = data.name || '';
            if (cid) cid.value = data.client_id || '';
            if (csc) csc.value = data.client_secret || '';
            if (uris) uris.value = (data.redirect_uris || []).join(', ');
        }
    }
}
