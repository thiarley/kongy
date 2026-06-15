/**
 * Consumers View
 * Handles consumer listing, details, credentials, ACLs and plugins
 */
import { api } from '../services/api';
import { i18n } from '../services/i18n';
import { UI } from '../ui';
import { store } from '../store';
import { runAction, showToast, validateRequiredFields } from '../utils';
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
        const consumers = data.data || [];
        store.setConsumers(consumers);
        ui.renderConsumers(consumers);
    } catch (e: any) {
        showToast(`${i18n.t('messages.error')}: ${e.message}`, 'error');
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
    loadConsumerCredentials(consumer.id, 'basic-auth', ui);
    loadConsumerPlugins(consumer.id);

    // Handle Save Details
    const updateBtn = document.getElementById('updateConsumerBtn');
    if (updateBtn) {
        updateBtn.onclick = () => runAction(async () => {
            const username = (document.getElementById('edit_consumer_username') as HTMLInputElement).value;
            const custom_id = (document.getElementById('edit_consumer_custom_id') as HTMLInputElement).value;
            const tagsRaw = (document.getElementById('edit_consumer_tags') as HTMLInputElement).value;
            const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

            const updated = await api.updateConsumer(consumer.id, {
                username: username || undefined,
                custom_id: custom_id || undefined,
                tags
            });
            currentConsumer = updated;
            if (nameEl) nameEl.textContent = updated.username || updated.id;
            showToast(i18n.t('consumers.update_success'), 'success');
        }, { button: updateBtn });
    }
}

export async function loadConsumerAcls(consumerId: string) {
    const tbody = document.querySelector('#consumerAclTable tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${i18n.t('messages.loading')}</td></tr>`;

    try {
        const res = await api.getConsumerAcls(consumerId);
        if (currentConsumer?.id !== consumerId) return;
        const acls = res.data || [];

        if (tbody) {
            if (acls.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${i18n.t('messages.no_data')}</td></tr>`;
            } else {
                tbody.innerHTML = acls.map((acl: any) => `
                    <tr>
                        <td><span class="badge badge-primary">${acl.group}</span></td>
                        <td>${new Date(acl.created_at * 1000).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-icon acl-edit-btn" data-id="${acl.id}" data-group="${acl.group}"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn-icon text-danger acl-delete-btn" data-id="${acl.id}" data-group="${acl.group}"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                 `).join('');

                tbody.querySelectorAll('.acl-edit-btn').forEach((btn: any) => {
                    btn.onclick = () => {
                        const modal = document.getElementById('aclModal');
                        if (modal) {
                            modal.dataset.aclId = btn.dataset.id;
                            modal.classList.remove('hidden');
                            const input = document.getElementById('acl_group') as HTMLInputElement;
                            if (input) input.value = btn.dataset.group;
                        }
                    };
                });

                tbody.querySelectorAll('.acl-delete-btn').forEach((btn: any) => {
                    btn.onclick = async () => {
                        if (await confirmAction(i18n.t('consumers.acls.delete_confirm', { group: btn.dataset.group }))) {
                            await runAction(async () => {
                                await api.deleteConsumerAcl(consumerId, btn.dataset.id);
                                await loadConsumerAcls(consumerId);
                            }, { button: btn });
                        }
                    };
                });
            }
        }
    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-danger">${i18n.t('messages.error')}</td></tr>`;
    }
}

export async function loadConsumerCredentials(consumerId: string, type: string, ui?: UI) { // ui optional
    const tbody = document.querySelector('#consumerCredentialsTable tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${i18n.t('messages.loading')}</td></tr>`;

    try {
        const res = await api.getConsumerCredentials(consumerId, type);
        if (currentConsumer?.id !== consumerId) return;
        const creds = res.data || [];

        if (tbody) {
            if (creds.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${i18n.t('consumers.credentials.empty')}</td></tr>`;
            } else {
                tbody.innerHTML = creds.map((c: any) => {
                    let detail = c.key || c.username || c.id;
                    if (type === 'jwt') detail = c.key || c.algorithm;
                    if (type === 'oauth2') detail = c.name || c.client_id;

                    // store data for populate
                    const dataStr = encodeURIComponent(JSON.stringify(c));

                    return `
                        <tr>
                            <td><code>${detail}</code></td>
                            <td>${new Date(c.created_at * 1000).toLocaleDateString()}</td>
                            <td>
                                <button class="btn-icon cred-edit-btn" data-id="${c.id}" data-raw="${dataStr}"><i class="ph ph-pencil-simple"></i></button>
                                <button class="btn-icon text-danger cred-delete-btn" data-id="${c.id}"><i class="ph ph-trash"></i></button>
                            </td>
                        </tr>
                     `;
                }).join('');

                tbody.querySelectorAll('.cred-edit-btn').forEach((btn: any) => {
                    btn.onclick = () => {
                        if (!ui) return; // Need ui instance passed
                        const data = JSON.parse(decodeURIComponent(btn.dataset.raw));

                        ui.renderCredentialForm(type);
                        ui.populateCredentialForm(type, data);

                        const modal = document.getElementById('credentialModal');
                        if (modal) {
                            modal.dataset.credId = btn.dataset.id;
                            modal.dataset.mode = 'edit';
                            ui.openModal('credentialModal');
                            const title = document.getElementById('credentialModalTitle');
                            if (title) title.innerText = `${i18n.t('actions.edit')} Credencial (${type})`;
                        }
                    };
                });

                tbody.querySelectorAll('.cred-delete-btn').forEach((btn: any) => {
                    btn.onclick = async () => {
                        if (await confirmAction(i18n.t('consumers.credentials.delete_confirm'))) {
                            await runAction(async () => {
                                await api.deleteConsumerCredential(consumerId, type, btn.dataset.id);
                                await loadConsumerCredentials(consumerId, type, ui);
                            }, { button: btn });
                        }
                    };
                });
            }
        }
    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-danger">${i18n.t('messages.error')}</td></tr>`;
    }
}

export async function loadConsumerPlugins(consumerId: string) {
    const tbody = document.querySelector('#consumerPluginsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${i18n.t('messages.loading')}</td></tr>`;

    try {
        const res = await api.getConsumerPlugins(consumerId);
        if (currentConsumer?.id !== consumerId) return;
        const plugins = res.data || [];

        if (plugins.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${i18n.t('plugins.no_plugins')}</td></tr>`;
        } else {
            tbody.innerHTML = plugins.map((p: any) => `
                <tr>
                    <td><span class="badge badge-primary">${p.name}</span></td>
                    <td><span class="badge ${p.enabled ? 'badge-success' : 'badge-warning'}">${p.enabled ? i18n.t('plugins.enabled') : i18n.t('plugins.disabled')}</span></td>
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
                    await runAction(async () => {
                        await api.updatePlugin(btn.dataset.id, { enabled: !enabled });
                        await loadConsumerPlugins(consumerId);
                        showToast(enabled ? i18n.t('plugins.toggle_off') : i18n.t('plugins.toggle_on'), 'success');
                    }, { button: btn });
                };
            });

            tbody.querySelectorAll('.plugin-delete-btn').forEach((btn: any) => {
                btn.onclick = async () => {
                    if (await confirmAction(i18n.t('plugins.delete_confirm'))) {
                        await runAction(async () => {
                            await api.deletePlugin(btn.dataset.id);
                            await loadConsumerPlugins(consumerId);
                            showToast(i18n.t('plugins.delete_success'), 'success');
                        }, { button: btn });
                    }
                };
            });
        }
    } catch (e: any) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">${i18n.t('messages.error')}</td></tr>`;
    }
}

export function handleAddConsumer(ui: UI, callbacks: ConsumersViewCallbacks) {
    ui.openModal('consumerModal');
    (document.getElementById('consumer_username') as HTMLInputElement).value = '';
    (document.getElementById('consumer_custom_id') as HTMLInputElement).value = '';
    (document.getElementById('consumer_tags') as HTMLInputElement).value = '';

    const btn = document.getElementById('saveConsumerBtn');
    if (btn) {
        btn.onclick = () => runAction(async () => {
            const username = (document.getElementById('consumer_username') as HTMLInputElement).value;
            const custom_id = (document.getElementById('consumer_custom_id') as HTMLInputElement).value;
            const tags = (document.getElementById('consumer_tags') as HTMLInputElement).value;

            if (!username && !custom_id) {
                validateRequiredFields([
                    { id: 'consumer_username', message: i18n.t('errors.consumer_id_required') }
                ], document.getElementById('consumerModal') || document);
                return showToast(i18n.t('errors.consumer_id_required'), 'warning');
            }

            await api.createConsumer({
                username: username || undefined,
                custom_id: custom_id || undefined,
                tags: tags ? tags.split(',').map(t => t.trim()) : []
            });
            ui.closeModal('consumerModal');
            await loadConsumersView(ui, callbacks);
            showToast(i18n.t('consumers.create_success'), 'success');
        }, { button: btn });
    }
}
