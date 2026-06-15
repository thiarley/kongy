/**
 * Services View
 * Handles service listing, creation and management
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { runAction, showToast, validateRequiredFields } from '../utils';

export interface ServicesViewCallbacks {
    switchView: (view: string) => void;
    updateServiceContext: (service: any | null, syncUrl?: boolean) => void;
    refreshRoutes: () => Promise<void>;
}

let lastServices: any[] = [];

function renderServices(ui: UI) {
    const term = ((document.getElementById('serviceSearch') as HTMLInputElement | null)?.value || '').toLowerCase();
    const services = term
        ? lastServices.filter(service => [
            service.name,
            service.id,
            service.host,
            service.protocol,
            service.path,
            ...(service.tags || [])
        ].join(' ').toLowerCase().includes(term))
        : lastServices;

    ui.renderServices(services, api.getServiceId());
}

export async function loadServicesView(ui: UI, callbacks: ServicesViewCallbacks) {
    callbacks.switchView('SERVICES');
    const loadingEl = document.getElementById('serviceLoading');
    const searchInput = document.getElementById('serviceSearch') as HTMLInputElement | null;
    if (searchInput) searchInput.oninput = () => renderServices(ui);

    try {
        if (loadingEl) loadingEl.classList.remove('hidden');
        const data = await api.getServices();
        lastServices = data.data || [];
        renderServices(ui);
        const selectedService = lastServices.find((service: any) => service.id === api.getServiceId()) || null;
        callbacks.updateServiceContext(selectedService, false);
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

export function handleAddService(ui: UI, callbacks: ServicesViewCallbacks) {
    ui.clearServiceForm();
    ui.openModal('serviceModal');

    const btn = document.getElementById('saveServiceBtn') as HTMLElement | null;
    if (!btn) return;

    btn.onclick = () => runAction(async () => {
        const name = (document.getElementById('svc_name') as HTMLInputElement).value;
        const host = (document.getElementById('svc_host') as HTMLInputElement).value;
        const protocol = (document.getElementById('svc_protocol') as HTMLSelectElement).value;
        const port = parseInt((document.getElementById('svc_port') as HTMLInputElement).value);
        const path = (document.getElementById('svc_path') as HTMLInputElement).value;
        const retries = parseInt((document.getElementById('svc_retries') as HTMLInputElement).value);
        const connect_timeout = parseInt((document.getElementById('svc_connect_timeout') as HTMLInputElement).value);
        const write_timeout = parseInt((document.getElementById('svc_write_timeout') as HTMLInputElement).value);
        const read_timeout = parseInt((document.getElementById('svc_read_timeout') as HTMLInputElement).value);
        const tagsRaw = (document.getElementById('svc_tags') as HTMLInputElement).value;
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

        if (!validateRequiredFields([
            { id: 'svc_name', message: i18n.t('errors.required') },
            { id: 'svc_host', message: i18n.t('errors.required') }
        ], document.getElementById('serviceModal') || document)) {
            return showToast(i18n.t('errors.name_host_required'), 'warning');
        }

        await api.createService({
            name, host, protocol: protocol as any, port,
            path: path || undefined,
            retries: isNaN(retries) ? undefined : retries,
            connect_timeout: isNaN(connect_timeout) ? undefined : connect_timeout,
            write_timeout: isNaN(write_timeout) ? undefined : write_timeout,
            read_timeout: isNaN(read_timeout) ? undefined : read_timeout,
            tags
        });
        ui.closeModal('serviceModal');
        await loadServicesView(ui, callbacks);
        showToast(i18n.t('services.create_success'), 'success');
    }, { button: btn });
}

export function bindServiceCallbacks(
    ui: UI,
    callbacks: ServicesViewCallbacks
) {
    // Select service
    ui.triggerServiceSelect = async (svc: any) => {
        api.setServiceId(svc.id);
        callbacks.updateServiceContext(svc, false);
        callbacks.switchView('ROUTES');
        await callbacks.refreshRoutes();
    };

    // Edit service
    ui.triggerServiceEdit = (svc: any) => {
        const title = document.getElementById('serviceModalTitle');
        if (title) title.textContent = `${i18n.t('actions.edit')} ${i18n.t('services.entity')}`;

        ui.openModal('serviceModal');
        (document.getElementById('svc_name') as HTMLInputElement).value = svc.name || '';
        (document.getElementById('svc_host') as HTMLInputElement).value = svc.host || '';
        (document.getElementById('svc_protocol') as HTMLSelectElement).value = svc.protocol || 'http';
        (document.getElementById('svc_port') as HTMLInputElement).value = svc.port || '80';
        (document.getElementById('svc_path') as HTMLInputElement).value = svc.path || '';
        (document.getElementById('svc_retries') as HTMLInputElement).value = svc.retries ?? '5';
        (document.getElementById('svc_connect_timeout') as HTMLInputElement).value = svc.connect_timeout ?? '60000';
        (document.getElementById('svc_write_timeout') as HTMLInputElement).value = svc.write_timeout ?? '60000';
        (document.getElementById('svc_read_timeout') as HTMLInputElement).value = svc.read_timeout ?? '60000';
        (document.getElementById('svc_tags') as HTMLInputElement).value = (svc.tags || []).join(', ');

        const btn = document.getElementById('saveServiceBtn');
        if (btn) {
            btn.onclick = () => runAction(async () => {
                const name = (document.getElementById('svc_name') as HTMLInputElement).value;
                const host = (document.getElementById('svc_host') as HTMLInputElement).value;
                const protocol = (document.getElementById('svc_protocol') as HTMLSelectElement).value;
                const port = parseInt((document.getElementById('svc_port') as HTMLInputElement).value);
                const path = (document.getElementById('svc_path') as HTMLInputElement).value;
                const retries = parseInt((document.getElementById('svc_retries') as HTMLInputElement).value);
                const connect_timeout = parseInt((document.getElementById('svc_connect_timeout') as HTMLInputElement).value);
                const write_timeout = parseInt((document.getElementById('svc_write_timeout') as HTMLInputElement).value);
                const read_timeout = parseInt((document.getElementById('svc_read_timeout') as HTMLInputElement).value);
                const tagsRaw = (document.getElementById('svc_tags') as HTMLInputElement).value;
                const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

                if (!validateRequiredFields([
                    { id: 'svc_name', message: i18n.t('errors.required') },
                    { id: 'svc_host', message: i18n.t('errors.required') }
                ], document.getElementById('serviceModal') || document)) {
                    return showToast(i18n.t('errors.name_host_required'), 'warning');
                }

                await api.updateService(svc.id, {
                    name, host, protocol: protocol as any, port,
                    path: path || undefined,
                    retries: isNaN(retries) ? undefined : retries,
                    connect_timeout: isNaN(connect_timeout) ? undefined : connect_timeout,
                    write_timeout: isNaN(write_timeout) ? undefined : write_timeout,
                    read_timeout: isNaN(read_timeout) ? undefined : read_timeout,
                    tags
                });
                ui.closeModal('serviceModal');
                await loadServicesView(ui, callbacks);
                showToast(i18n.t('services.update_success'), 'success');
            }, { button: btn });
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
            await runAction(async () => {
                await api.deleteService(svc.id);
                await loadServicesView(ui, callbacks);
                showToast(i18n.t('services.delete_success'), 'success');
            });
        }
    };
}
