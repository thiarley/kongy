/**
 * Upstreams View
 * Handles upstream and target management
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { escapeHtml, runAction, showToast, renderIncrementally, validateRequiredFields } from '../utils';
import { confirmAction } from './shared';

export interface UpstreamsViewCallbacks {
    switchView: (view: string) => void;
}

let lastUpstreams: any[] = [];

function renderUpstreams(ui: UI, callbacks: UpstreamsViewCallbacks) {
    const tbody = document.querySelector('#upstreamsTable tbody');
    if (!tbody) return;

    const term = ((document.getElementById('upstreamSearch') as HTMLInputElement | null)?.value || '').toLowerCase();
    const upstreams = term
        ? lastUpstreams.filter(upstream => [
            upstream.name,
            upstream.id,
            upstream.algorithm,
            ...(upstream.tags || [])
        ].join(' ').toLowerCase().includes(term))
        : lastUpstreams;

    if (upstreams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-4">${i18n.t('messages.no_data')}</td></tr>`;
        return;
    }

    renderIncrementally({
        key: 'upstreams',
        container: tbody as HTMLElement,
        items: upstreams,
        batchSize: 40,
        renderItem: (u: any) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.algorithm)}</td>
                <td>${u.slots}</td>
                <td>-</td>
                <td>
                    <button class="btn-icon text-primary upstream-targets" title="${i18n.t('actions.manage_targets')}"><i class="ph ph-crosshair"></i></button>
                </td>
                <td>
                    <button class="btn-icon text-primary upstream-edit" title="${i18n.t('actions.edit')}"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon text-danger upstream-del" title="${i18n.t('actions.delete')}"><i class="ph ph-trash"></i></button>
                </td>
            `;

            (tr.querySelector('.upstream-edit') as HTMLElement).onclick = () => handleEditUpstream(ui, u.id, callbacks);
            (tr.querySelector('.upstream-targets') as HTMLElement).onclick = () => loadTargetsView(ui, u.id, u.name);
            (tr.querySelector('.upstream-del') as HTMLElement).onclick = async () => {
                if (await confirmAction(i18n.t('upstreams.delete_confirm'))) {
                    await runAction(async () => {
                        await api.deleteUpstream(u.id);
                        await loadUpstreamsView(ui, callbacks);
                    }, { button: tr.querySelector('.upstream-del') as HTMLElement });
                }
            };

            return tr;
        }
    });
}

export async function loadUpstreamsView(ui: UI, callbacks: UpstreamsViewCallbacks) {
    callbacks.switchView('UPSTREAMS');
    const searchInput = document.getElementById('upstreamSearch') as HTMLInputElement | null;
    if (searchInput) searchInput.oninput = () => renderUpstreams(ui, callbacks);

    try {
        const data = await api.getUpstreams();
        lastUpstreams = data.data || [];
        renderUpstreams(ui, callbacks);
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
    }
}

export async function handleEditUpstream(ui: UI, id: string, callbacks: UpstreamsViewCallbacks) {
    ui.openModal('upstreamModal');

    try {
        const u: any = await api.fetchKong('GET', `/upstreams/${id}`);

        (document.getElementById('upstream_name') as HTMLInputElement).value = u.name || '';
        (document.getElementById('upstream_algorithm') as HTMLInputElement).value = u.algorithm || 'round-robin';
        (document.getElementById('upstream_slots') as HTMLInputElement).value = u.slots || 10000;
        (document.getElementById('upstream_tags') as HTMLInputElement).value = (u.tags || []).join(', ');

        const saveBtn = document.getElementById('saveUpstreamBtn');
        if (saveBtn) {
            saveBtn.onclick = () => runAction(async () => {
                const name = (document.getElementById('upstream_name') as HTMLInputElement).value;
                const algorithm = (document.getElementById('upstream_algorithm') as HTMLInputElement).value;
                const slots = parseInt((document.getElementById('upstream_slots') as HTMLInputElement).value);
                const tags = (document.getElementById('upstream_tags') as HTMLInputElement).value;

                if (!validateRequiredFields([{ id: 'upstream_name', message: i18n.t('errors.required') }], document.getElementById('upstreamModal') || document)) {
                    return showToast(i18n.t('errors.required'), 'warning');
                }

                await api.updateUpstream(id, {
                    name, algorithm, slots,
                    tags: tags ? tags.split(',').map(t => t.trim()) : []
                });
                ui.closeModal('upstreamModal');
                await loadUpstreamsView(ui, callbacks);
                showToast(i18n.t('upstreams.update_success'), 'success');
            }, { button: saveBtn });
        }
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
    }
}

export function handleAddUpstream(ui: UI, callbacks: UpstreamsViewCallbacks) {
    ui.openModal('upstreamModal');

    // Clear form
    (document.getElementById('upstream_name') as HTMLInputElement).value = '';
    (document.getElementById('upstream_algorithm') as HTMLSelectElement).value = 'round-robin';
    (document.getElementById('upstream_slots') as HTMLInputElement).value = '10000';
    (document.getElementById('upstream_tags') as HTMLInputElement).value = '';

    const btn = document.getElementById('saveUpstreamBtn') as HTMLElement | null;
    if (btn) {
        btn.onclick = () => runAction(async () => {
            const name = (document.getElementById('upstream_name') as HTMLInputElement).value;
            const slots = (document.getElementById('upstream_slots') as HTMLInputElement).value;
            const algorithm = (document.getElementById('upstream_algorithm') as HTMLInputElement).value;
            const tagsRaw = (document.getElementById('upstream_tags') as HTMLInputElement).value;
            const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

            if (!validateRequiredFields([{ id: 'upstream_name', message: i18n.t('errors.required') }], document.getElementById('upstreamModal') || document)) {
                return showToast(i18n.t('errors.required'), 'warning');
            }

            await api.createUpstream({
                name,
                slots: parseInt(slots) || 10000,
                algorithm: algorithm || 'round-robin',
                tags
            });
            ui.closeModal('upstreamModal');
            await loadUpstreamsView(ui, callbacks);
            showToast(i18n.t('upstreams.create_success'), 'success');
        }, { button: btn });
    }
}

export async function loadTargetsView(ui: UI, upstreamId: string, upstreamName: string) {
    ui.openModal('targetsModal');

    const titleEl = document.getElementById('targetsModalUpstreamName');
    const inputId = document.getElementById('targets_upstream_id') as HTMLInputElement;

    if (titleEl) titleEl.innerText = upstreamName;
    if (inputId) inputId.value = upstreamId;

    const tbody = document.querySelector('#targetsTable tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center">${i18n.t('messages.loading')}</td></tr>`;

    try {
        let targets = [];
        try {
            const healthData = await api.getUpstreamHealth(upstreamId);
            targets = healthData.data || [];
        } catch (e) {
            console.warn('Health check fallback');
            const { data } = await api.getUpstreamTargets(upstreamId);
            targets = data || [];
        }

        if (tbody) {
            if (targets.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${i18n.t('upstreams.targets_empty')}</td></tr>`;
            } else {
                tbody.innerHTML = targets.map((t: any) => `
                <tr>
                    <td>${t.target}</td>
                    <td>${t.weight}</td>
                    <td>${(t.tags || []).join(', ')}</td>
                    <td>
                        <span class="badge ${t.health === 'HEALTHY' ? 'badge-success' : t.health === 'UNHEALTHY' ? 'badge-danger' : 'badge-warning'}">
                            ${t.health || 'UNKNOWN'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon text-danger target-del" data-id="${t.id}"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `).join('');

                tbody.querySelectorAll('.target-del').forEach((btn: any) => {
                    btn.onclick = async () => {
                        if (confirm(i18n.t('upstreams.delete_target_confirm'))) {
                            await runAction(async () => {
                                await api.deleteUpstreamTarget(upstreamId, btn.dataset.id);
                                await loadTargetsView(ui, upstreamId, upstreamName);
                            }, { button: btn });
                        }
                    };
                });
            }
        }
    } catch (e: any) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`;
    }
}

export async function handleAddTarget(ui: UI) {
    const upstreamId = (document.getElementById('targets_upstream_id') as HTMLInputElement).value;
    const target = (document.getElementById('target_target') as HTMLInputElement).value;
    const weight = (document.getElementById('target_weight') as HTMLInputElement).value;
    const tags = (document.getElementById('target_tags') as HTMLInputElement).value;

    if (!upstreamId || !target) {
        validateRequiredFields([{ id: 'target_target', message: i18n.t('errors.target_required') }], document.getElementById('targetsModal') || document);
        return showToast(i18n.t('errors.target_required'), 'warning');
    }

    await runAction(async () => {
        await api.addUpstreamTarget(upstreamId, {
            target,
            weight: parseInt(weight) || 100,
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        });
        const nameEl = document.getElementById('targetsModalUpstreamName');
        await loadTargetsView(ui, upstreamId, nameEl?.innerText || '');
        (document.getElementById('target_target') as HTMLInputElement).value = '';
        showToast(i18n.t('upstreams.add_target_success'), 'success'); // Added success toast
    }, { button: document.getElementById('addTargetBtn') });
}
