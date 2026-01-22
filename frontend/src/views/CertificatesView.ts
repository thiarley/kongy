/**
 * Certificates View
 * Handles certificate listing, creation and management
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { showToast } from '../utils';
import { confirmAction } from './shared';

export interface CertificatesViewCallbacks {
    switchView: (view: string) => void;
}

export async function loadCertificatesView(ui: UI, callbacks: CertificatesViewCallbacks) {
    callbacks.switchView('CERTIFICATES');

    try {
        const data = await api.getCertificates();
        const tbody = document.querySelector('#certificatesTable tbody');

        if (tbody) {
            tbody.innerHTML = (data.data || []).map((c: any) => `
                <tr>
                    <td class="font-monospace small">${c.id.substring(0, 8)}...</td>
                    <td>${(c.snis || []).join(', ')}</td>
                    <td>${(c.tags || []).join(', ')}</td>
                    <td>${new Date(c.created_at * 1000).toLocaleDateString()}</td>
                    <td>
                         <button class="btn-icon text-primary cert-edit" data-id="${c.id}"><i class="ph ph-pencil-simple"></i></button>
                         <button class="btn-icon text-danger cert-del" data-id="${c.id}"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.cert-del').forEach((btn: any) => {
                btn.onclick = async () => {
                    if (await confirmAction(i18n.t('certificates.delete_confirm'))) {
                        await api.deleteCertificate(btn.dataset.id);
                        loadCertificatesView(ui, callbacks);
                    }
                };
            });

            tbody.querySelectorAll('.cert-edit').forEach((btn: any) => {
                btn.onclick = () => handleEditCertificate(ui, btn.dataset.id, callbacks);
            });
        }
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

        const saveBtn = document.getElementById('saveCertificateBtn');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const certVal = (document.getElementById('certificate_cert') as HTMLInputElement).value;
                const keyVal = (document.getElementById('certificate_key') as HTMLInputElement).value;
                const snisVal = (document.getElementById('certificate_snis') as HTMLInputElement).value;
                const tagsVal = (document.getElementById('certificate_tags') as HTMLInputElement).value;

                try {
                    await api.updateCertificate(id, {
                        cert: certVal,
                        key: keyVal,
                        snis: snisVal ? snisVal.split(',').map(s => s.trim()) : [],
                        tags: tagsVal ? tagsVal.split(',').map(t => t.trim()) : []
                    });
                    ui.closeModal('certificateModal');
                    loadCertificatesView(ui, callbacks);
                    showToast(i18n.t('certificates.update_success'), 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            };
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

    const saveBtn = document.getElementById('saveCertificateBtn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const cert = (document.getElementById('certificate_cert') as HTMLInputElement).value;
            const key = (document.getElementById('certificate_key') as HTMLInputElement).value;
            const snis = (document.getElementById('certificate_snis') as HTMLInputElement).value;
            const tags = (document.getElementById('certificate_tags') as HTMLInputElement).value;

            try {
                await api.createCertificate({
                    cert,
                    key,
                    snis: snis ? snis.split(',').map(s => s.trim()) : [],
                    tags: tags ? tags.split(',').map(t => t.trim()) : []
                });
                ui.closeModal('certificateModal');
                loadCertificatesView(ui, callbacks);
                showToast(i18n.t('certificates.create_success'), 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        };
    }
}
