/**
 * Routes View
 * Handles route listing, creation, import/export and batch operations
 */
import { api } from '../services/api';
import { UI } from '../ui';
import { store } from '../store';
import { showToast, setBusy } from '../utils';
import { confirmAction } from './shared';

export interface RoutesViewCallbacks {
    switchView: (view: string) => void;
}

export async function refreshRoutes() {
    try {
        store.setLoading(true);
        const serviceId = api.getServiceId();
        const data = serviceId ? await api.getServiceRoutes(serviceId) : await api.getRoutes();
        store.setRoutes(data.data || []);

        // Get plugins too
        const pluginsData = await api.getPlugins();
        store.setPlugins(pluginsData.data || []);

    } catch (e: any) {
        showToast('Erro ao carregar rotas: ' + e.message, 'error');
    } finally {
        store.setLoading(false);
    }
}

export function handleAddRoute(ui: UI) {
    ui.openModal('editModal');
    ui.clearRouteForm();

    const btn = document.getElementById('saveRouteBtn');
    if (btn) {
        btn.onclick = async () => {
            const data = ui.getRouteFormData();
            if (!data.name) {
                return showToast('Nome da rota obrigatório (recomendado)', 'warning');
            }

            try {
                await api.saveRoute(data);
                ui.closeModal('editModal');
                refreshRoutes();
                showToast('Rota criada', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        };
    }
}

export function handleExportRoutes() {
    const selectedIds = new Set(store.selectedIds);
    const routes = store.state.routes
        .filter(r => selectedIds.has(r.id))
        .map(r => {
            const plugins = store.getRoutePlugins(r.id).map(p => {
                const { ...pData } = p;
                return pData;
            });

            const { raw, source, ...rData } = r as any;
            return {
                ...raw,
                plugins: plugins
            };
        });

    const exportObj = {
        created_at: new Date().toISOString(),
        info: 'Konga Manager Export',
        routes: routes
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "routes.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function handleLoadFile(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
        try {
            const raw = JSON.parse(e.target.result);
            let routesList = [];

            if (Array.isArray(raw)) {
                routesList = raw;
            } else if (raw.routes && Array.isArray(raw.routes)) {
                routesList = raw.routes;
            } else {
                throw new Error('O arquivo deve conter uma lista de rotas ou um objeto com a propriedade "routes".');
            }

            setBusy(document.getElementById('routesTable'), true);

            let count = 0;
            let errors = 0;
            let pluginErrors = 0;

            const currentServiceId = api.getServiceId();

            for (const r of routesList) {
                try {
                    const { id, created_at, updated_at, service, plugins, ...payload } = r;

                    if (currentServiceId) {
                        payload.service = { id: currentServiceId };
                    } else if (service && service.id) {
                        payload.service = { id: service.id };
                    }

                    const newRoute = await api.saveRoute(payload);
                    count++;

                    if (plugins && Array.isArray(plugins)) {
                        for (const p of plugins) {
                            try {
                                const { id: pId, created_at: pCa, updated_at: pUa, route: pRoute, ...pPayload } = p;
                                pPayload.route = { id: newRoute.id };
                                await api.createPlugin(pPayload);
                            } catch (pEx) {
                                console.error('Failed to import plugin', p, pEx);
                                pluginErrors++;
                            }
                        }
                    }

                } catch (innerEx) {
                    console.error('Failed to import route', r, innerEx);
                    errors++;
                }
            }

            setBusy(document.getElementById('routesTable'), false);
            refreshRoutes();

            let msg = `${count} rotas importadas.`;
            if (errors > 0) msg += ` ${errors} falharam.`;
            if (pluginErrors > 0) msg += ` ${pluginErrors} plugins falharam.`;

            showToast(msg, errors > 0 ? 'warning' : 'success');

        } catch (err: any) {
            setBusy(document.getElementById('routesTable'), false);
            showToast('Erro ao importar: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

export function handleBatchEdit(ui: UI) {
    const ids = store.selectedIds;
    if (ids.length === 0) return;

    ui.setBatchMode(true, ids.length);

    (document.getElementById('input_name') as HTMLInputElement).value = '';
    (document.getElementById('input_paths') as HTMLInputElement).value = '';
    (document.getElementById('input_tags') as HTMLInputElement).value = '';

    document.querySelectorAll('.batch-field-check').forEach((el: any) => el.checked = false);

    ui.openModal('editModal');

    const btn = document.getElementById('saveRouteBtn');
    if (btn) {
        btn.onclick = async () => {
            const updates: any = {};
            const checks = document.querySelectorAll('.batch-field-check:checked');

            if (checks.length === 0) {
                showToast('Selecione pelo menos um campo para alterar', 'warning');
                return;
            }

            const data = ui.getRouteFormData();

            checks.forEach((c: any) => {
                const target = c.dataset.target;
                if (target === 'paths') updates.paths = data.paths;
                if (target === 'methods') updates.methods = data.methods;
                if (target === 'tags') updates.tags = data.tags;
                if (target === 'options') {
                    updates.strip_path = data.strip_path;
                    updates.preserve_host = data.preserve_host;
                }
            });

            if (Object.keys(updates).length === 0) return;

            setBusy(document.querySelector('.modal-content'), true);

            let successCount = 0;
            let errorCount = 0;

            try {
                await Promise.all(ids.map(async (id) => {
                    try {
                        await api.updateRoute(id, updates);
                        successCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }));

                ui.closeModal('editModal');
                refreshRoutes();

                if (errorCount === 0) {
                    showToast(`${successCount} rotas atualizadas com sucesso`, 'success');
                } else {
                    showToast(`${successCount} atualizadas, ${errorCount} falharam`, 'warning');
                }
            } catch (e: any) {
                showToast('Erro no processamento em lote', 'error');
            } finally {
                setBusy(document.querySelector('.modal-content'), false);
                ui.setBatchMode(false);
            }
        };
    }
}

export function bindRouteCallbacks(ui: UI) {
    // Edit route
    ui.triggerEdit = async (route: any) => {
        ui.setBatchMode(false);
        ui.openModal('editModal');
        ui.populateRouteForm(route);

        const btn = document.getElementById('saveRouteBtn');
        if (btn) {
            btn.onclick = async () => {
                const data = ui.getRouteFormData();
                try {
                    await api.updateRoute(route.id, data);
                    ui.closeModal('editModal');
                    refreshRoutes();
                    showToast('Rota atualizada!', 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            };
        }
    };

    // Delete route
    ui.triggerDelete = async (route: any) => {
        if (await confirmAction('Deletar rota?')) {
            try {
                await api.deleteRoute(route.id);
                store.removeRoute(route.id);
                refreshRoutes();
                showToast('Rota deletada', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        }
    };
}
