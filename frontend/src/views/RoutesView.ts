/**
 * Routes View
 * Handles route listing, creation, import/export and batch operations
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
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
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
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
                return showToast(i18n.t('errors.name_required'), 'warning');
            }

            try {
                await api.saveRoute(data);
                ui.closeModal('editModal');
                refreshRoutes();
                showToast(i18n.t('routes.create_success'), 'success');
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
                throw new Error(i18n.t('messages.import_error'));
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

            let msg = i18n.t('messages.import_success', { count });
            if (errors > 0 || pluginErrors > 0) {
                msg = i18n.t('messages.batch_partial', { success: count, errors: errors + pluginErrors });
            }

            showToast(msg, errors > 0 ? 'warning' : 'success');

        } catch (err: any) {
            setBusy(document.getElementById('routesTable'), false);
            showToast(`${i18n.t('messages.import_error')}: ${err.message}`, 'error');
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
                showToast(i18n.t('routes.batch_no_change_warning'), 'warning');
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
                    showToast(i18n.t('messages.batch_success', { count: successCount }), 'success');
                } else {
                    showToast(i18n.t('messages.batch_partial', { success: successCount, errors: errorCount }), 'warning');
                }
            } catch (e: any) {
                showToast(i18n.t('messages.error'), 'error');
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
                    showToast(i18n.t('routes.update_success'), 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            };
        }
    };

    // Delete route
    ui.triggerDelete = async (route: any) => {
        if (await confirmAction(i18n.t('routes.delete_confirm'))) {
            try {
                await api.deleteRoute(route.id);
                store.removeRoute(route.id);
                refreshRoutes();
                showToast(i18n.t('routes.delete_success'), 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        }
    };
}

export async function handleBatchDelete(ui: UI) {
    const ids = store.selectedIds;
    if (ids.length === 0) return showToast(i18n.t('routes.select_warning'), 'warning');

    if (await confirmAction(i18n.t('routes.delete_multiple_confirm', { count: ids.length }))) {
        setBusy(document.getElementById('routesTable'), true);
        let success = 0;
        let errors = 0;

        for (const id of ids) {
            try {
                await api.deleteRoute(id);
                success++;
            } catch (e) {
                errors++;
            }
        }

        refreshRoutes();
        setBusy(document.getElementById('routesTable'), false);

        if (errors === 0) {
            showToast(i18n.t('messages.batch_delete_success', { count: success }), 'success');
        } else {
            showToast(i18n.t('messages.batch_partial', { success, errors }), 'warning');
        }
    }
}
