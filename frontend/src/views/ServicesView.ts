/**
 * Services View
 * Handles service listing, creation and management
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { showToast } from '../utils';

export interface ServicesViewCallbacks {
    switchView: (view: string) => void;
    updateServiceContext: (id: string | null) => void;
    refreshRoutes: () => Promise<void>;
}

export async function loadServicesView(ui: UI, callbacks: ServicesViewCallbacks) {
    callbacks.switchView('SERVICES');
    const loadingEl = document.getElementById('serviceLoading');

    try {
        if (loadingEl) loadingEl.classList.remove('hidden');
        const data = await api.getServices();
        ui.renderServices(data.data || [], api.getServiceId());
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

export function handleAddService(ui: UI, callbacks: ServicesViewCallbacks) {
    ui.openModal('serviceModal');

    const btn = document.getElementById('saveServiceBtn');
    if (!btn) return;

    btn.onclick = async () => {
        const name = (document.getElementById('svc_name') as HTMLInputElement).value;
        const host = (document.getElementById('svc_host') as HTMLInputElement).value;

        if (!name || !host) {
            return showToast(i18n.t('errors.name_host_required'), 'warning');
        }

        try {
            await api.createService({ name, host, protocol: 'http', port: 80 });
            ui.closeModal('serviceModal');
            loadServicesView(ui, callbacks);
            showToast(i18n.t('services.create_success'), 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };
}

export function bindServiceCallbacks(
    ui: UI,
    callbacks: ServicesViewCallbacks
) {
    // Select service
    ui.triggerServiceSelect = (svc: any) => {
        api.setServiceId(svc.id);
        callbacks.updateServiceContext(svc.id);
        callbacks.switchView('ROUTES');
        callbacks.refreshRoutes();
    };

    // Edit service
    ui.triggerServiceEdit = (svc: any) => {
        ui.openModal('serviceModal');
        (document.getElementById('svc_name') as HTMLInputElement).value = svc.name || '';
        (document.getElementById('svc_host') as HTMLInputElement).value = svc.host || '';

        const btn = document.getElementById('saveServiceBtn');
        if (btn) {
            btn.onclick = async () => {
                const name = (document.getElementById('svc_name') as HTMLInputElement).value;
                const host = (document.getElementById('svc_host') as HTMLInputElement).value;

                try {
                    await api.updateService(svc.id, { name, host });
                    ui.closeModal('serviceModal');
                    loadServicesView(ui, callbacks);
                    showToast(i18n.t('services.update_success'), 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            };
        }
    };

    // Delete service
    ui.triggerServiceDelete = async (svc: any) => {
        // @ts-ignore - Swal is global
        const result = await Swal.fire({
            title: i18n.t('services.delete_confirm', { name: svc.name }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: i18n.t('actions.confirm'),
            cancelButtonText: i18n.t('actions.cancel')
        });

        if (result.isConfirmed) {
            try {
                await api.deleteService(svc.id);
                loadServicesView(ui, callbacks);
                showToast(i18n.t('services.delete_success'), 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        }
    };
}
