/**
 * Plugins View
 * Handles plugin management for routes, services and consumers
 */
import { api } from '../services/api';
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

    select.innerHTML = '<option value="">Selecione um plugin...</option>';

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
        const routePlugins = store.getRoutePlugins(route.id);

        ui.renderRoutePluginsList(routePlugins, route, {
            onToggle: async (id: string, enabled: boolean) => {
                await api.updatePlugin(id, { enabled });
                refreshRoutes();
            },
            onDelete: async (id: string) => {
                if (await confirmAction('Deletar plugin?')) {
                    await api.deletePlugin(id);
                    refreshRoutes();
                    setTimeout(() => loadRoutePlugins(ui, route), 500);
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
                if (await confirmAction('Deletar plugin do serviço?')) {
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
    if (!pluginName) return showToast('Selecione um plugin', 'warning');

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
    if (ids.length === 0) return showToast('Selecione rotas', 'warning');

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
        else if (type === 'array') config[field] = input.value ? input.value.split(',').map((s: string) => s.trim()) : [];
        else config[field] = input.value;
    });

    // JSON Blob fallback
    const jsonBlob = (document.getElementById('pluginConfigJson') as HTMLTextAreaElement)?.value;
    if (jsonBlob) {
        try {
            Object.assign(config, JSON.parse(jsonBlob));
        } catch (e) {
            return showToast('JSON Inválido', 'error');
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
        showToast(`Batch: ${success} plugins criados.`, 'success');
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

            showToast('Plugin criado', 'success');
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
            showToast('Plugin atualizado', 'success');
            ui.closeModal('pluginConfigModal');
            refreshRoutes();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
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
}
