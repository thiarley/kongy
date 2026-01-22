/**
 * Consumers View
 * Handles consumer listing, details, credentials, ACLs and plugins
 */
import { api } from '../services/api';
import { UI } from '../ui';
import { showToast } from '../utils';
import { confirmAction } from './shared';

export interface ConsumersViewCallbacks {
    switchView: (view: string) => void;
}

let currentConsumer: any = null;

export function getCurrentConsumer() {
    return currentConsumer;
}

export async function loadConsumersView(ui: UI, callbacks: ConsumersViewCallbacks) {
    callbacks.switchView('CONSUMERS');

    try {
        const data = await api.getConsumers();
        ui.renderConsumers(data.data || []);
    } catch (e: any) {
        showToast('Erro consumers: ' + e.message, 'error');
    }
}

export async function loadConsumerDetails(ui: UI, consumer: any, callbacks: ConsumersViewCallbacks) {
    callbacks.switchView('CONSUMER_DETAILS');
    currentConsumer = consumer;

    // Update Header
    const nameEl = document.getElementById('consumerDetailsName');
    const idEl = document.getElementById('consumerDetailsId');
    if (nameEl) nameEl.textContent = consumer.username || 'No Username';
    if (idEl) idEl.textContent = consumer.id;

    // Reset Tabs
    const tabs = document.querySelectorAll('#view-consumer-details .tabs:not(.credential-tabs) .tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    if (tabs[0]) tabs[0].classList.add('active');

    // Hide all tab contents
    document.querySelectorAll('#view-consumer-details .tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('tab-consumer-details')?.classList.remove('hidden');

    // Populate Details Form
    const usernameInput = document.getElementById('edit_consumer_username') as HTMLInputElement;
    const customIdInput = document.getElementById('edit_consumer_custom_id') as HTMLInputElement;
    const tagsInput = document.getElementById('edit_consumer_tags') as HTMLInputElement;

    if (usernameInput) usernameInput.value = consumer.username || '';
    if (customIdInput) customIdInput.value = consumer.custom_id || '';
    if (tagsInput) tagsInput.value = (consumer.tags || []).join(', ');

    // Load sub-resources
    loadConsumerAcls(consumer.id);
    loadConsumerCredentials(consumer.id, 'basic-auth');
    loadConsumerPlugins(consumer.id);
}

export async function loadConsumerAcls(consumerId: string) {
    const tbody = document.querySelector('#consumerAclTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Carregando...</td></tr>';

    try {
        const res = await api.getConsumerAcls(consumerId);
        const acls = res.data || [];

        if (tbody) {
            if (acls.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum grupo</td></tr>';
            } else {
                tbody.innerHTML = acls.map((acl: any) => `
                    <tr>
                        <td><span class="badge badge-primary">${acl.group}</span></td>
                        <td>${new Date(acl.created_at * 1000).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-icon text-danger acl-delete-btn" data-id="${acl.id}" data-group="${acl.group}"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                 `).join('');

                tbody.querySelectorAll('.acl-delete-btn').forEach((btn: any) => {
                    btn.onclick = async () => {
                        if (await confirmAction(`Remover grupo ${btn.dataset.group}?`)) {
                            await api.deleteConsumerAcl(consumerId, btn.dataset.id);
                            loadConsumerAcls(consumerId);
                        }
                    };
                });
            }
        }
    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-danger">Erro ao carregar</td></tr>';
    }
}

export async function loadConsumerCredentials(consumerId: string, type: string) {
    const tbody = document.querySelector('#consumerCredentialsTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Carregando...</td></tr>';

    try {
        const res = await api.getConsumerCredentials(consumerId, type);
        const creds = res.data || [];

        if (tbody) {
            if (creds.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhuma credencial</td></tr>';
            } else {
                tbody.innerHTML = creds.map((c: any) => {
                    let detail = c.key || c.username || c.id;
                    if (type === 'jwt') detail = c.key || c.algorithm;
                    if (type === 'oauth2') detail = c.name || c.client_id;

                    return `
                        <tr>
                            <td><code>${detail}</code></td>
                            <td>${new Date(c.created_at * 1000).toLocaleDateString()}</td>
                            <td><button class="btn-icon text-danger cred-delete-btn" data-id="${c.id}"><i class="ph ph-trash"></i></button></td>
                        </tr>
                     `;
                }).join('');

                tbody.querySelectorAll('.cred-delete-btn').forEach((btn: any) => {
                    btn.onclick = async () => {
                        if (await confirmAction('Remover credencial?')) {
                            await api.deleteConsumerCredential(consumerId, type, btn.dataset.id);
                            loadConsumerCredentials(consumerId, type);
                        }
                    };
                });
            }
        }
    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-danger">Erro ao carregar</td></tr>';
    }
}

export async function loadConsumerPlugins(consumerId: string) {
    const tbody = document.querySelector('#consumerPluginsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Carregando...</td></tr>';

    try {
        const res = await api.getConsumerPlugins(consumerId);
        const plugins = res.data || [];

        if (plugins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum plugin</td></tr>';
        } else {
            tbody.innerHTML = plugins.map((p: any) => `
                <tr>
                    <td><span class="badge badge-primary">${p.name}</span></td>
                    <td><span class="badge ${p.enabled ? 'badge-success' : 'badge-warning'}">${p.enabled ? 'Ativo' : 'Inativo'}</span></td>
                    <td>${new Date(p.created_at * 1000).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-icon text-primary plugin-toggle-btn" data-id="${p.id}" data-enabled="${p.enabled}">
                            <i class="ph ph-${p.enabled ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn-icon text-danger plugin-delete-btn" data-id="${p.id}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.plugin-toggle-btn').forEach((btn: any) => {
                btn.onclick = async () => {
                    const enabled = btn.dataset.enabled === 'true';
                    try {
                        await api.updatePlugin(btn.dataset.id, { enabled: !enabled });
                        loadConsumerPlugins(consumerId);
                        showToast(enabled ? 'Plugin desativado' : 'Plugin ativado', 'success');
                    } catch (e: any) {
                        showToast(e.message, 'error');
                    }
                };
            });

            tbody.querySelectorAll('.plugin-delete-btn').forEach((btn: any) => {
                btn.onclick = async () => {
                    if (await confirmAction('Remover plugin?')) {
                        await api.deletePlugin(btn.dataset.id);
                        loadConsumerPlugins(consumerId);
                        showToast('Plugin removido', 'success');
                    }
                };
            });
        }
    } catch (e: any) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Erro ao carregar plugins</td></tr>';
    }
}

export function handleAddConsumer(ui: UI, callbacks: ConsumersViewCallbacks) {
    ui.openModal('consumerModal');

    const btn = document.getElementById('saveConsumerBtn');
    if (btn) {
        btn.onclick = async () => {
            const username = (document.getElementById('consumer_username') as HTMLInputElement).value;
            const custom_id = (document.getElementById('consumer_custom_id') as HTMLInputElement).value;
            const tags = (document.getElementById('consumer_tags') as HTMLInputElement).value;

            if (!username && !custom_id) {
                return showToast('Username ou Custom ID obrigatório', 'warning');
            }

            try {
                await api.createConsumer({
                    username: username || undefined,
                    custom_id: custom_id || undefined,
                    tags: tags ? tags.split(',').map(t => t.trim()) : []
                });
                ui.closeModal('consumerModal');
                loadConsumersView(ui, callbacks);
                showToast('Consumer criado', 'success');
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        };
    }
}
