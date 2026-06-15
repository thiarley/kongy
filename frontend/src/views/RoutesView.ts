/**
 * Routes View
 * Handles route listing, creation, import/export and batch operations
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { store } from '../store';
import { showToast, setBusy, escapeHtml, runAction, validateRequiredFields } from '../utils';
import { confirmAction } from './shared';

export interface RoutesViewCallbacks {
    switchView: (view: string) => void;
}

interface ImportFailure {
    kind: 'route' | 'plugin';
    routeName: string;
    pluginName?: string;
    message: string;
}

let latestRoutesRefreshId = 0;

function sanitizeExportedPlugin(plugin: any) {
    const { id, created_at, updated_at, route, service, consumer, ...pluginData } = plugin;
    return pluginData;
}

function sanitizeExportedRoute(route: any) {
    const { raw, source, service, id, created_at, updated_at, ...routeData } = route;
    return routeData;
}

function getImportRouteLabel(route: any, index: number): string {
    return route.name || route.id || `route-${index + 1}`;
}

function getImportErrorMessage(error: any): string {
    return error?.message || error?.detail || i18n.t('messages.error');
}

function buildImportResultHtml(
    routeCount: number,
    pluginCount: number,
    successCount: number,
    pluginSuccessCount: number,
    failures: ImportFailure[]
): string {
    const failureItems = failures.length === 0
        ? '<li>Nenhuma falha registrada.</li>'
        : failures.map(failure => `
            <li style="margin-bottom: 8px;">
                <strong>${escapeHtml(failure.routeName)}</strong>
                ${failure.pluginName ? ` / plugin <code>${escapeHtml(failure.pluginName)}</code>` : ''}
                <br>
                <span style="opacity: 0.85;">${escapeHtml(failure.message)}</span>
            </li>
        `).join('');

    return `
        <div style="text-align: left;">
            <p><strong>Rotas no arquivo:</strong> ${routeCount}</p>
            <p><strong>Plugins no arquivo:</strong> ${pluginCount}</p>
            <p><strong>Rotas importadas:</strong> ${successCount}</p>
            <p><strong>Plugins importados:</strong> ${pluginSuccessCount}</p>
            <p><strong>Falhas:</strong> ${failures.length}</p>
            <div style="margin-top: 16px; max-height: 260px; overflow: auto; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px;">
                <strong>Detalhes</strong>
                <ul style="margin: 12px 0 0 18px; padding: 0;">
                    ${failureItems}
                </ul>
            </div>
        </div>
    `;
}

async function showImportPreview(routesList: any[], currentServiceId: string) {
    const pluginCount = routesList.reduce((total, route) => total + (Array.isArray(route.plugins) ? route.plugins.length : 0), 0);
    const requiresSelectedService = !currentServiceId;

    // @ts-ignore - Swal is global
    return Swal.fire({
        title: 'Resumo da importacao',
        icon: requiresSelectedService ? 'warning' : 'info',
        html: `
            <div style="text-align: left;">
                <p><strong>Rotas encontradas:</strong> ${routesList.length}</p>
                <p><strong>Plugins encontrados:</strong> ${pluginCount}</p>
                <p><strong>Servico de destino:</strong> ${currentServiceId ? `<code>${escapeHtml(currentServiceId)}</code>` : 'nenhum'}</p>
                ${requiresSelectedService ? `
                    <div style="margin-top: 12px; padding: 12px; border-radius: 8px; background: rgba(245, 158, 11, 0.1);">
                        Escolha primeiro um servico na interface.
                        A importacao de rotas sempre usa o servico atualmente selecionado.
                    </div>
                ` : `
                    <div style="margin-top: 12px; padding: 12px; border-radius: 8px; background: rgba(59, 130, 246, 0.1);">
                        O <code>service.id</code> do arquivo sera ignorado, se existir.
                        Todas as rotas serao importadas para o servico selecionado.
                    </div>
                `}
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: requiresSelectedService ? 'Fechar' : 'Importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
    });
}

export async function refreshRoutes(excludeIds?: Set<string>) {
    const refreshId = ++latestRoutesRefreshId;

    try {
        store.setLoading(true);
        const serviceId = api.getServiceId();
        const data = serviceId ? await api.getServiceRoutes(serviceId) : await api.getRoutes();

        if (refreshId !== latestRoutesRefreshId || serviceId !== api.getServiceId()) {
            return;
        }

        let routes = data.data || [];
        
        if (excludeIds && excludeIds.size > 0) {
            routes = routes.filter((r: any) => !excludeIds.has(r.id));
        }
        
        store.setRoutes(routes);

        // Load all plugins in a few paginated requests, then keep only those for visible routes.
        const routeIds = new Set(routes.map((route: any) => route.id));
        const pluginsResponse = await api.getAllPlugins();

        if (refreshId !== latestRoutesRefreshId || serviceId !== api.getServiceId()) {
            return;
        }

        const routePlugins = (pluginsResponse.data || []).filter((plugin: any) =>
            plugin.route?.id && routeIds.has(plugin.route.id)
        );
        store.setPlugins(routePlugins);

    } catch (e: any) {
        if (refreshId === latestRoutesRefreshId) {
            showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
        }
    } finally {
        if (refreshId === latestRoutesRefreshId) {
            store.setLoading(false);
        }
    }
}

export function handleAddRoute(ui: UI) {
    ui.openModal('editModal');
    ui.clearRouteForm();

    const btn = document.getElementById('saveRouteBtn') as HTMLElement | null;
    if (btn) {
        btn.onclick = () => runAction(async () => {
            const data = ui.getRouteFormData();
            if (!data.name) {
                validateRequiredFields([{ id: 'input_name', message: i18n.t('errors.name_required') || i18n.t('errors.required') }], document.getElementById('editModal') || document);
                return showToast(i18n.t('errors.name_required'), 'warning');
            }

            await api.saveRoute(data);
            ui.closeModal('editModal');
            await refreshRoutes();
            showToast(i18n.t('routes.create_success'), 'success');
        }, { button: btn });
    }
}

export function handleExportRoutes() {
    const selectedIds = new Set(store.selectedIds);
    const routes = store.state.routes
        .filter(r => selectedIds.has(r.id))
        .map(r => {
            const plugins = store.getRoutePlugins(r.id).map(sanitizeExportedPlugin);
            const rData = sanitizeExportedRoute(r as any);
            return {
                ...rData,
                plugins: plugins
            };
        });

    const exportObj = {
        created_at: new Date().toISOString(),
        info: 'Kongy Manager Export',
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

export function handleDownloadImportExample() {
    const exampleObj = {
        created_at: new Date().toISOString(),
        info: 'Kongy Manager Import Example',
        routes: [
            {
                name: 'example-route',
                paths: ['/example'],
                methods: ['GET', 'POST'],
                strip_path: true,
                preserve_host: false,
                tags: ['example', 'publico'],
                plugins: [
                    {
                        name: 'cors',
                        enabled: true,
                        config: {
                            origins: ['*'],
                            methods: ['GET', 'POST'],
                            headers: ['Accept', 'Authorization', 'Content-Type'],
                            credentials: true,
                            max_age: 3600
                        }
                    }
                ]
            }
        ]
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exampleObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "routes-import-example.json");
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

            const currentServiceId = api.getServiceId();
            const preview = await showImportPreview(routesList, currentServiceId);
            if (!preview.isConfirmed || !currentServiceId) {
                event.target.value = '';
                return;
            }

            setBusy(document.getElementById('routesTable'), true);

            let count = 0;
            let pluginSuccessCount = 0;
            const failures: ImportFailure[] = [];

            for (const [index, r] of routesList.entries()) {
                const routeLabel = getImportRouteLabel(r, index);
                try {
                    const { id, created_at, updated_at, service, plugins, ...payload } = r;
                    payload.service = { id: currentServiceId };

                    const newRoute = await api.saveRoute(payload);
                    count++;

                    if (plugins && Array.isArray(plugins)) {
                        for (const p of plugins) {
                            try {
                                const { id: pId, created_at: pCa, updated_at: pUa, route: pRoute, ...pPayload } = p;
                                pPayload.route = { id: newRoute.id };
                                await api.createPlugin(pPayload);
                                pluginSuccessCount++;
                            } catch (pEx) {
                                console.error('Failed to import plugin', p, pEx);
                                failures.push({
                                    kind: 'plugin',
                                    routeName: routeLabel,
                                    pluginName: p.name,
                                    message: getImportErrorMessage(pEx)
                                });
                            }
                        }
                    }

                } catch (innerEx) {
                    console.error('Failed to import route', r, innerEx);
                    failures.push({
                        kind: 'route',
                        routeName: routeLabel,
                        message: getImportErrorMessage(innerEx)
                    });
                }
            }

            setBusy(document.getElementById('routesTable'), false);
            await refreshRoutes();

            const pluginCount = routesList.reduce(
                (total: number, route: any) => total + (Array.isArray(route.plugins) ? route.plugins.length : 0),
                0
            );
            const html = buildImportResultHtml(routesList.length, pluginCount, count, pluginSuccessCount, failures);

            // @ts-ignore - Swal is global
            await Swal.fire({
                title: failures.length > 0 ? 'Resultado da importacao' : 'Importacao concluida',
                icon: failures.length > 0 ? 'warning' : 'success',
                html,
                width: 760,
                confirmButtonText: 'Fechar',
                confirmButtonColor: '#3085d6'
            });

            if (failures.length === 0) {
                showToast(i18n.t('messages.import_success', { count }), 'success');
            } else {
                showToast(i18n.t('messages.batch_partial', { success: count, errors: failures.length }), 'warning');
            }

        } catch (err: any) {
            setBusy(document.getElementById('routesTable'), false);
            showToast(`${i18n.t('messages.import_error')}: ${err.message}`, 'error');
        } finally {
            event.target.value = '';
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

    const btn = document.getElementById('saveRouteBtn') as HTMLElement | null;
    if (btn) {
        btn.onclick = () => runAction(async () => {
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

            await Promise.all(ids.map(async (id) => {
                try {
                    await api.updateRoute(id, updates);
                    successCount++;
                } catch (e) {
                    errorCount++;
                }
            }));

            ui.closeModal('editModal');
            await refreshRoutes();

            if (errorCount === 0) {
                showToast(i18n.t('messages.batch_success', { count: successCount }), 'success');
            } else {
                showToast(i18n.t('messages.batch_partial', { success: successCount, errors: errorCount }), 'warning');
            }
            setBusy(document.querySelector('.modal-content'), false);
            ui.setBatchMode(false);
        }, { button: btn, onError: (e: any) => {
            setBusy(document.querySelector('.modal-content'), false);
            ui.setBatchMode(false);
            showToast(e?.message || i18n.t('messages.error'), 'error');
        } });
    }
}

export function bindRouteCallbacks(ui: UI) {
    // Edit route
    ui.triggerEdit = async (route: any) => {
        ui.setBatchMode(false);
        ui.openModal('editModal');
        ui.populateRouteForm(route);

        const btn = document.getElementById('saveRouteBtn') as HTMLElement | null;
        if (btn) {
            btn.onclick = () => runAction(async () => {
                const data = ui.getRouteFormData();
                await api.updateRoute(route.id, data);
                ui.closeModal('editModal');
                await refreshRoutes();
                showToast(i18n.t('routes.update_success'), 'success');
            }, { button: btn });
        }
    };

    // Delete route
    ui.triggerDelete = async (route: any) => {
        if (await confirmAction(i18n.t('routes.delete_confirm'))) {
            try {
                await runAction(async () => {
                    await api.deleteRoute(route.id);
                    store.removeRoute(route.id);
                    await refreshRoutes(new Set([route.id]));
                    showToast(i18n.t('routes.delete_success'), 'success');
                });
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
        await runAction(async () => {
            setBusy(document.getElementById('routesTable'), true);
            let success = 0;
            let errors = 0;
            const deletedIds = new Set<string>();

            for (const id of ids) {
                try {
                    await api.deleteRoute(id);
                    deletedIds.add(id);
                    success++;
                } catch (e) {
                    errors++;
                }
            }

            await refreshRoutes(deletedIds);
            setBusy(document.getElementById('routesTable'), false);

            if (errors === 0) {
                showToast(i18n.t('messages.batch_delete_success', { count: success }), 'success');
            } else {
                showToast(i18n.t('messages.batch_partial', { success, errors }), 'warning');
            }
        }, { button: document.getElementById('deleteSelectedBtn'), onError: (e: any) => {
            setBusy(document.getElementById('routesTable'), false);
            showToast(e?.message || i18n.t('messages.error'), 'error');
        } });
    }
}
