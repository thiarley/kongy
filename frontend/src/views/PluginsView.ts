/**
 * Plugins View
 * Handles plugin management for routes, services and consumers
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { store } from '../store';
import { showToast, setBusy, getPluginIcon } from '../utils';
import { confirmAction } from './shared';
import { refreshRoutes } from './RoutesView';

export async function populatePluginSelect() {
    const select = document.getElementById('pluginSelect') as HTMLSelectElement;
    if (!select) return;

    // Get context
    const modal = document.getElementById('pluginsModal');
    const entityType = modal?.dataset.entityType;

    select.innerHTML = `<option value="">${i18n.t('plugins.select_placeholder')}</option>`;

    try {
        const { enabled_plugins } = await api.getAvailablePlugins();

        let plugins = enabled_plugins || [];

        // Filter out Auth plugins for Consumers
        if (entityType === 'consumer') {
            const forbidden = ['key-auth', 'basic-auth', 'jwt', 'oauth2', 'hmac-auth', 'ldap-auth', 'session'];
            plugins = plugins.filter((p: string) => !forbidden.includes(p));
        }

        plugins.forEach((p: string) => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.text = `${getPluginIcon(p)} ${p}`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error loading plugins', e);
    }
}

export async function loadRoutePlugins(ui: UI, route: any) {
    try {
        const { data: routePlugins } = await api.getPlugins(route.id);

        ui.renderRoutePluginsList(routePlugins, route, {
            onToggle: async (id: string, enabled: boolean) => {
                await api.updatePlugin(id, { enabled });
                await refreshRoutes();
                await loadRoutePlugins(ui, route);
            },
            onDelete: async (id: string) => {
                if (await confirmAction(i18n.t('plugins.delete_confirm'))) {
                    await api.deletePlugin(id);
                    await refreshRoutes();
                    await loadRoutePlugins(ui, route);
                }
            },
            onEdit: (plugin: any) => {
                handleEditPlugin(ui, plugin, route.name);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

export async function loadServicePlugins(ui: UI, svc: any) {
    try {
        const { data: plugins } = await api.getPlugins(undefined, svc.id);

        ui.renderRoutePluginsList(plugins, svc, {
            onToggle: async (id: string, enabled: boolean) => {
                await api.updatePlugin(id, { enabled });
                loadServicePlugins(ui, svc);
            },
            onDelete: async (id: string) => {
                if (await confirmAction(i18n.t('plugins.delete_confirm'))) {
                    await api.deletePlugin(id);
                    loadServicePlugins(ui, svc);
                }
            },
            onEdit: (plugin: any) => {
                handleEditPlugin(ui, plugin, svc.name);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

export async function handleAddPlugin(ui: UI) {
    const modal = document.getElementById('pluginsModal');
    const select = document.getElementById('pluginSelect') as HTMLSelectElement;

    if (!modal || !select) return;

    const pluginName = select.value;
    if (!pluginName) return showToast(i18n.t('errors.plugin_required'), 'warning');

    try {
        const schema = await api.getPluginSchema(pluginName);
        openPluginConfigModal(ui, null, schema, pluginName);
    } catch (e) {
        console.error(e);
        openPluginConfigModal(ui, null, null, pluginName);
    }
}

export function handleBatchPlugin(ui: UI) {
    const ids = store.selectedIds;
    if (ids.length === 0) return showToast(i18n.t('routes.select_warning'), 'warning');

    ui.openModal('pluginsModal');
    const modal = document.getElementById('pluginsModal');
    if (modal) {
        modal.dataset.mode = 'batch';
        modal.dataset.entityType = 'route';
    }
    populatePluginSelect();
    const list = document.getElementById('pluginsList');
    if (list) list.style.display = 'none';
}

export function openPluginConfigModal(ui: UI, plugin: any | null, schema: any, pluginName: string) {
    ui.openModal('pluginConfigModal');
    ui.renderPluginConfigForm(plugin, schema, pluginName);

    const modal = document.getElementById('pluginConfigModal');
    if (modal) {
        modal.dataset.pluginName = pluginName;
        modal.dataset.pluginId = plugin?.id || '';

        const parentModal = document.getElementById('pluginsModal');
        if (!plugin && parentModal) {
            modal.dataset.entityType = parentModal.dataset.entityType;
            modal.dataset.entityId = parentModal.dataset.entityId;
            modal.dataset.mode = parentModal.dataset.mode;
        }
    }
}

export async function handleEditPlugin(ui: UI, plugin: any, entityName: string) {
    try {
        const schema = await api.getPluginSchema(plugin.name);
        openPluginConfigModal(ui, plugin, schema, plugin.name);
    } catch (e) {
        openPluginConfigModal(ui, plugin, null, plugin.name);
    }
}

export async function handleSavePluginConfig(ui: UI) {
    const modal = document.getElementById('pluginConfigModal');
    if (!modal) return;

    const pluginName = modal.dataset.pluginName;
    const pluginId = modal.dataset.pluginId;
    const entityType = modal.dataset.entityType;
    const entityId = modal.dataset.entityId || '';
    const mode = modal.dataset.mode;

    // Harvest Data
    const config: any = {};

    modal.querySelectorAll('.plugin-config-field').forEach((input: any) => {
        const field = input.dataset.field;
        const type = input.dataset.type;
        if (type === 'boolean') config[field] = input.checked;
        else if (type === 'number') config[field] = parseFloat(input.value) || 0;
        else if (type === 'array' || type === 'set') config[field] = input.value ? input.value.split(',').map((s: string) => s.trim()) : [];
        else config[field] = input.value;
    });

    // JSON Blob fallback
    const jsonBlob = (document.getElementById('pluginConfigJson') as HTMLTextAreaElement)?.value;
    if (jsonBlob) {
        try {
            Object.assign(config, JSON.parse(jsonBlob));
        } catch (e) {
            return showToast(i18n.t('messages.json_invalid'), 'error');
        }
    }

    const payload: any = {
        name: pluginName,
        config,
        enabled: true
    };

    // BATCH MODE
    if (mode === 'batch' && !pluginId) {
        const ids = store.selectedIds;
        setBusy(modal, true);
        let success = 0;
        let errors = 0;

        for (const id of ids) {
            try {
                await api.createPlugin({ ...payload, route: { id } });
                success++;
            } catch (e) {
                errors++;
            }
        }

        setBusy(modal, false);
        showToast(i18n.t('plugins.batch_create_success', { count: success }), 'success');
        ui.closeModal('pluginConfigModal');
        ui.closeModal('pluginsModal');
        refreshRoutes();
        return;
    }

    // SINGLE MODE
    if (!pluginId) {
        // CREATE
        if (entityType === 'route') payload.route = { id: entityId };
        else if (entityType === 'service') payload.service = { id: entityId };
        else if (entityType === 'consumer') payload.consumer = { id: entityId };

        // Sanitize config - potentially leaked system fields
        const forbidden = ['consumer', 'route', 'service', 'id', 'created_at', 'updated_at', 'enabled', 'run_on', 'protocols'];
        if (payload.config) {
            forbidden.forEach(k => delete payload.config[k]);
        }

        try {
            await api.createPlugin(payload);

            showToast(i18n.t('plugins.create_success'), 'success');
            ui.closeModal('pluginConfigModal');

            if (entityType === 'route') {
                refreshRoutes();
                setTimeout(() => {
                    const r = store.state.routes.find(x => x.id === entityId);
                    if (r) loadRoutePlugins(ui, r);
                }, 500);
            } else if (entityType === 'service') {
                loadServicePlugins(ui, { id: entityId });
            } else if (entityType === 'consumer') {
                import('./ConsumersView').then(m => m.loadConsumerPlugins(entityId));
            }
        } catch (e: any) {
            console.error(e);
            showToast(e.message, 'error');
        }
    } else {
        // UPDATE
        try {
            await api.updatePlugin(pluginId, { config });
            showToast(i18n.t('plugins.update_success'), 'success');
            ui.closeModal('pluginConfigModal');
            refreshRoutes();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    }
}

export async function handleCopyPlugins(ui: UI) {
    const modal = document.getElementById('pluginsModal');
    if (!modal) return;

    const targetType = modal.dataset.entityType as 'route' | 'service';
    const targetId = modal.dataset.entityId || '';

    if (!targetId || !targetType) return;

    // Get all routes for selection (excluding current if it's a route)
    const routes = store.state.routes.filter(r => r.source === 'remote' && r.id !== targetId);

    if (routes.length === 0) {
        return showToast(i18n.t('routes.empty_state'), 'warning');
    }

    const routeOptions = routes.reduce((acc: any, r) => {
        acc[r.id] = r.name || r.id;
        return acc;
    }, {});

    // Step 1: Select Source Route
    // @ts-ignore - Swal is global
    const { value: sourceId } = await Swal.fire({
        title: i18n.t('plugins.copy_select_route_title'),
        input: 'select',
        inputOptions: routeOptions,
        inputPlaceholder: i18n.t('plugins.copy_select_route_placeholder'),
        showCancelButton: true,
        confirmButtonText: i18n.t('actions.confirm'),
        cancelButtonText: i18n.t('actions.cancel'),
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#64748b',
        background: '#1e293b',
        color: '#f8fafc',
        width: '500px',
        customClass: {
            popup: 'glass-panel',
            input: 'form-control'
        }
    });

    if (!sourceId) return;

    // Step 2: Fetch plugins from source route
    try {
        // We use a small loading overlay instead of setBusy on the whole modal
        const pluginsListEl = document.getElementById('pluginsList');
        setBusy(pluginsListEl, true);

        const { data: sourcePlugins } = await api.getPlugins(sourceId);
        setBusy(pluginsListEl, false);

        if (!sourcePlugins || sourcePlugins.length === 0) {
            return showToast(i18n.t('plugins.no_plugins'), 'info');
        }

        // Step 3: Select which plugins to copy
        const pluginListHtml = sourcePlugins.map((p: any) => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left;">
                <input type="checkbox" name="plugin_to_copy" value="${p.id}" id="chk_${p.id}" checked 
                       style="width: 20px; height: 20px; cursor: pointer; accent-color: #6366f1;">
                <label for="chk_${p.id}" style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; margin: 0;">
                    <span style="font-size: 1.2rem;">${getPluginIcon(p.name)}</span>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 500;">${p.name}</span>
                        <span style="font-size: 0.75rem; color: #94a3b8;">${p.id.substring(0, 8)}...</span>
                    </div>
                </label>
            </div>
        `).join('');

        // @ts-ignore
        const { value: selectedIds } = await Swal.fire({
            title: i18n.t('plugins.copy_select_plugins_title'),
            html: `
                <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                    ${pluginListHtml}
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: i18n.t('plugins.copy_confirm_btn'),
            cancelButtonText: i18n.t('actions.cancel'),
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#64748b',
            background: '#1e293b',
            color: '#f8fafc',
            width: '500px',
            customClass: {
                popup: 'glass-panel'
            },
            preConfirm: () => {
                const checked = document.querySelectorAll('input[name="plugin_to_copy"]:checked');
                return Array.from(checked).map((c: any) => c.value);
            }
        });

        if (selectedIds && selectedIds.length > 0) {
            const footer = modal.querySelector('.modal-footer') as HTMLElement;
            setBusy(footer, true);
            
            try {
                const result = await api.copyPlugins(targetType, targetId, 'route', sourceId, selectedIds);
                if (result.success) {
                    showToast(i18n.t('messages.batch_success', { count: result.count }), 'success');
                    if (result.errors && result.errors.length > 0) {
                        showToast(`${result.errors.length} falhas registradas`, 'warning');
                    }
                    
                    // Refresh current view
                    if (targetType === 'route') {
                        refreshRoutes();
                        const r = store.state.routes.find(x => x.id === targetId);
                        if (r) loadRoutePlugins(ui, r);
                    } else {
                        loadServicePlugins(ui, { id: targetId });
                    }
                }
            } catch (e: any) {
                showToast(e.message, 'error');
            } finally {
                setBusy(footer, false);
            }
        }
    } catch (e: any) {
        showToast(e.message, 'error');
        const pluginsListEl = document.getElementById('pluginsList');
        setBusy(pluginsListEl, false);
    }
}

export function bindPluginCallbacks(ui: UI) {
    // Route plugins
    ui.triggerPlugins = async (route: any) => {
        ui.openModal('pluginsModal');
        const modal = document.getElementById('pluginsModal');
        if (modal) {
            modal.dataset.entityType = 'route';
            modal.dataset.entityId = route.id;
        }
        populatePluginSelect();
        loadRoutePlugins(ui, route);
    };

    // Service plugins
    ui.triggerServicePlugins = async (svc: any) => {
        ui.openModal('pluginsModal');
        const modal = document.getElementById('pluginsModal');
        if (modal) {
            modal.dataset.entityType = 'service';
            modal.dataset.entityId = svc.id;
        }
        populatePluginSelect();
        loadServicePlugins(ui, svc);
    };

    // Copy plugins binding
    const copyBtn = document.getElementById('copyPluginsFromRouteBtn');
    if (copyBtn) {
        copyBtn.onclick = () => handleCopyPlugins(ui);
    }
}
