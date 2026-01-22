/**
 * Upstreams View
 * Handles upstream and target management
 */
import { api } from '../services/api';
import { UI } from '../ui';
import { showToast } from '../utils';
import { confirmAction } from './shared';

export interface UpstreamsViewCallbacks {
    switchView: (view: string) => void;
}

export async function loadUpstreamsView(ui: UI, callbacks: UpstreamsViewCallbacks) {
    callbacks.switchView('UPSTREAMS');

    try {
        const data = await api.getUpstreams();
        const tbody = document.querySelector('#upstreamsTable tbody');

        if (tbody) {
            tbody.innerHTML = (data.data || []).map((u: any) => `
                <tr>
                    <td class="fw-bold">${u.name}</td>
                    <td>${u.algorithm}</td>
                    <td>${u.slots}</td>
                    <td>-</td>
                    <td>
                        <button class="btn-icon text-primary upstream-targets" data-id="${u.id}" data-name="${u.name}" title="Gerenciar Targets"><i class="ph ph-crosshair"></i></button>
                    </td>
                    <td>
                        <button class="btn-icon text-primary upstream-edit" data-id="${u.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon text-danger upstream-del" data-id="${u.id}" data-name="${u.name}" title="Deletar"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            // Bind Edit
            tbody.querySelectorAll('.upstream-edit').forEach((btn: any) => {
                btn.onclick = () => handleEditUpstream(ui, btn.dataset.id, callbacks);
            });

            // Bind Targets
            tbody.querySelectorAll('.upstream-targets').forEach((btn: any) => {
                btn.onclick = () => loadTargetsView(ui, btn.dataset.id, btn.dataset.name);
            });

            // Bind Delete
            tbody.querySelectorAll('.upstream-del').forEach((btn: any) => {
                btn.onclick = async () => {
                    if (await confirmAction('Deletar upstream?', `Deseja remover ${btn.dataset.name}?`)) {
                        await api.deleteUpstream(btn.dataset.id);
                        loadUpstreamsView(ui, callbacks);
                    }
                };
            });
        }
    } catch (e: any) {
        showToast('Erro upstreams: ' + e.message, 'error');
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
            saveBtn.onclick = async () => {
                const name = (document.getElementById('upstream_name') as HTMLInputElement).value;
                const algorithm = (document.getElementById('upstream_algorithm') as HTMLInputElement).value;
                const slots = parseInt((document.getElementById('upstream_slots') as HTMLInputElement).value);
                const tags = (document.getElementById('upstream_tags') as HTMLInputElement).value;

                try {
                    await api.updateUpstream(id, {
                        name, algorithm, slots,
                        tags: tags ? tags.split(',').map(t => t.trim()) : []
                    });
                    ui.closeModal('upstreamModal');
                    loadUpstreamsView(ui, callbacks);
                    showToast('Upstream updated', 'success');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            };
        }
    } catch (e: any) {
        showToast('Erro ao carregar upstream: ' + e.message, 'error');
    }
}

export function handleAddUpstream(ui: UI, callbacks: UpstreamsViewCallbacks) {
    ui.openModal('upstreamModal');

    // Clear form
    (document.getElementById('upstream_name') as HTMLInputElement).value = '';
    (document.getElementById('upstream_slots') as HTMLInputElement).value = '1000';

    const btn = document.getElementById('saveUpstreamBtn');
    if (btn) {
        btn.onclick = async () => {
            const name = (document.getElementById('upstream_name') as HTMLInputElement).value;
            const slots = (document.getElementById('upstream_slots') as HTMLInputElement).value;

            if (!name) return showToast('Nome obrigatório', 'warning');

            try {
                await api.createUpstream({ name, slots: parseInt(slots) || 1000 });
                ui.closeModal('upstreamModal');
                loadUpstreamsView(ui, callbacks);
                showToast('Upstream criado', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        };
    }
}

export async function loadTargetsView(ui: UI, upstreamId: string, upstreamName: string) {
    ui.openModal('targetsModal');

    const titleEl = document.getElementById('targetsModalUpstreamName');
    const inputId = document.getElementById('targets_upstream_id') as HTMLInputElement;

    if (titleEl) titleEl.innerText = upstreamName;
    if (inputId) inputId.value = upstreamId;

    const tbody = document.querySelector('#targetsTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        const { data: targets } = await api.getUpstreamTargets(upstreamId);

        if (tbody) {
            tbody.innerHTML = (targets || []).map((t: any) => `
               <tr>
                   <td>${t.target}</td>
                   <td>${t.weight}</td>
                   <td>${(t.tags || []).join(', ')}</td>
                   <td><span class="badge ${t.health === 'HEALTHY' ? 'badge-success' : 'badge-warning'}">Ativo</span></td>
                   <td>
                       <button class="btn-icon text-danger target-del" data-id="${t.id}"><i class="ph ph-trash"></i></button>
                   </td>
               </tr>
           `).join('');

            tbody.querySelectorAll('.target-del').forEach((btn: any) => {
                btn.onclick = async () => {
                    if (confirm('Deletar target?')) {
                        await api.deleteUpstreamTarget(upstreamId, btn.dataset.id);
                        loadTargetsView(ui, upstreamId, upstreamName);
                    }
                };
            });
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

    if (!upstreamId || !target) return showToast('Alvo é obrigatório', 'warning');

    try {
        await api.addUpstreamTarget(upstreamId, {
            target,
            weight: parseInt(weight) || 100,
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        });
        const nameEl = document.getElementById('targetsModalUpstreamName');
        loadTargetsView(ui, upstreamId, nameEl?.innerText || '');
        (document.getElementById('target_target') as HTMLInputElement).value = '';
    } catch (e: any) {
        showToast(e.message, 'error');
    }
}
