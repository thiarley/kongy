/**
 * Certificates View
 * Handles certificate listing, creation and management
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { escapeHtml, runAction, showToast, renderIncrementally, validateRequiredFields } from '../utils';
import { confirmAction } from './shared';

export interface CertificatesViewCallbacks {
    switchView: (view: string) => void;
}

let lastCertificates: any[] = [];

function renderCertificates(ui: UI, callbacks: CertificatesViewCallbacks) {
    const tbody = document.querySelector('#certificatesTable tbody');
    if (!tbody) return;

    const term = ((document.getElementById('certificateSearch') as HTMLInputElement | null)?.value || '').toLowerCase();
    const certificates = term
        ? lastCertificates.filter(cert => [
            cert.id,
            ...(cert.snis || []),
            ...(cert.tags || [])
        ].join(' ').toLowerCase().includes(term))
        : lastCertificates;

    if (certificates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-4">${i18n.t('messages.no_data')}</td></tr>`;
        return;
    }

    renderIncrementally({
        key: 'certificates',
        container: tbody as HTMLElement,
        items: certificates,
        batchSize: 40,
        renderItem: (c: any) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-monospace small">${escapeHtml(c.id?.substring(0, 8) || '')}...</td>
                <td>${(c.snis || []).map(escapeHtml).join(', ')}</td>
                <td>${(c.tags || []).map(escapeHtml).join(', ')}</td>
                <td>${new Date(c.created_at * 1000).toLocaleDateString()}</td>
                <td>
                     <button class="btn-icon text-primary cert-edit"><i class="ph ph-pencil-simple"></i></button>
                     <button class="btn-icon text-danger cert-del"><i class="ph ph-trash"></i></button>
                </td>
            `;

            (tr.querySelector('.cert-del') as HTMLElement).onclick = async () => {
                if (await confirmAction(i18n.t('certificates.delete_confirm'))) {
                    await runAction(async () => {
                        await api.deleteCertificate(c.id);
                        await loadCertificatesView(ui, callbacks);
                    }, { button: tr.querySelector('.cert-del') as HTMLElement });
                }
            };

            (tr.querySelector('.cert-edit') as HTMLElement).onclick = () => handleEditCertificate(ui, c.id, callbacks);
            return tr;
        }
    });
}

export async function loadCertificatesView(ui: UI, callbacks: CertificatesViewCallbacks) {
    callbacks.switchView('CERTIFICATES');
    const searchInput = document.getElementById('certificateSearch') as HTMLInputElement | null;
    if (searchInput) searchInput.oninput = () => renderCertificates(ui, callbacks);

    try {
        const data = await api.getCertificates();
        lastCertificates = data.data || [];
        renderCertificates(ui, callbacks);
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
    }
}

export async function handleEditCertificate(ui: UI, id: string, callbacks: CertificatesViewCallbacks) {
    ui.openModal('certificateModal');
    document.getElementById('certificateModalTitle')!.innerText = `${i18n.t('actions.edit')} ${i18n.t('certificates.title')}`;
    (document.getElementById('certificate_id') as HTMLInputElement).value = id;

    try {
        const cert: any = await api.fetchKong('GET', `/certificates/${id}`);

        (document.getElementById('certificate_cert') as HTMLInputElement).value = cert.cert || '';
        (document.getElementById('certificate_key') as HTMLInputElement).value = cert.key || '';
        (document.getElementById('certificate_snis') as HTMLInputElement).value = (cert.snis || []).join(', ');
        (document.getElementById('certificate_tags') as HTMLInputElement).value = (cert.tags || []).join(', ');

        const saveBtn = document.getElementById('saveCertificateBtn') as HTMLElement | null;
        if (saveBtn) {
            saveBtn.onclick = () => runAction(async () => {
                const certVal = (document.getElementById('certificate_cert') as HTMLInputElement).value;
                const keyVal = (document.getElementById('certificate_key') as HTMLInputElement).value;
                const snisVal = (document.getElementById('certificate_snis') as HTMLInputElement).value;
                const tagsVal = (document.getElementById('certificate_tags') as HTMLInputElement).value;

                if (!validateRequiredFields([
                    { id: 'certificate_cert', message: i18n.t('errors.required') },
                    { id: 'certificate_key', message: i18n.t('errors.required') }
                ], document.getElementById('certificateModal') || document)) {
                    return showToast(i18n.t('errors.required'), 'warning');
                }

                await api.updateCertificate(id, {
                    cert: certVal,
                    key: keyVal,
                    snis: snisVal ? snisVal.split(',').map(s => s.trim()) : [],
                    tags: tagsVal ? tagsVal.split(',').map(t => t.trim()) : []
                });
                ui.closeModal('certificateModal');
                await loadCertificatesView(ui, callbacks);
                showToast(i18n.t('certificates.update_success'), 'success');
            }, { button: saveBtn });
        }
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
        ui.closeModal('certificateModal');
    }
}

export function handleAddCertificate(ui: UI, callbacks: CertificatesViewCallbacks) {
    ui.openModal('certificateModal');

    // Clear form
    ['certificate_cert', 'certificate_key', 'certificate_snis', 'certificate_tags'].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) el.value = '';
    });

    const titleEl = document.getElementById('certificateModalTitle');
    if (titleEl) titleEl.innerText = `${i18n.t('actions.new')} ${i18n.t('certificates.title')}`;

    const saveBtn = document.getElementById('saveCertificateBtn') as HTMLElement | null;
    if (saveBtn) {
        saveBtn.onclick = () => runAction(async () => {
            const cert = (document.getElementById('certificate_cert') as HTMLInputElement).value;
            const key = (document.getElementById('certificate_key') as HTMLInputElement).value;
            const snis = (document.getElementById('certificate_snis') as HTMLInputElement).value;
            const tags = (document.getElementById('certificate_tags') as HTMLInputElement).value;

            if (!validateRequiredFields([
                { id: 'certificate_cert', message: i18n.t('errors.required') },
                { id: 'certificate_key', message: i18n.t('errors.required') }
            ], document.getElementById('certificateModal') || document)) {
                return showToast(i18n.t('errors.required'), 'warning');
            }

            await api.createCertificate({
                cert,
                key,
                snis: snis ? snis.split(',').map(s => s.trim()) : [],
                tags: tags ? tags.split(',').map(t => t.trim()) : []
            });
            ui.closeModal('certificateModal');
            await loadCertificatesView(ui, callbacks);
            showToast(i18n.t('certificates.create_success'), 'success');
        }, { button: saveBtn });
    }
}
