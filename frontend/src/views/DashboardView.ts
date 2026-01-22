/**
 * Dashboard View
 * Displays Kong node status and statistics
 */
import { api } from '../services/api';

export interface DashboardCallbacks {
    switchView: (view: string) => void;
}

export async function loadDashboard(callbacks: DashboardCallbacks) {
    callbacks.switchView('DASHBOARD');

    const dashHostname = document.getElementById('dashHostname');
    const dashVersion = document.getElementById('kongVersionBadge');

    if (dashHostname) dashHostname.innerText = 'Loading...';

    try {
        const status = await api.getNodeStatus();

        if (dashHostname) dashHostname.innerText = status.hostname || 'localhost';
        if (dashVersion) dashVersion.innerText = `Kong ${status.version}`;

        const luaEl = document.getElementById('dashLuaVersion');
        const pluginsEl = document.getElementById('dashPluginsCount');
        const adminEl = document.getElementById('dashAdminListen');
        const requestsEl = document.getElementById('dashTotalRequests');
        const servicesEl = document.getElementById('dashActiveServices');

        if (luaEl) luaEl.innerText = status.lua_version || '-';
        if (pluginsEl) pluginsEl.innerText = (status.plugins?.enabled_in_cluster || []).length.toString();
        if (adminEl) adminEl.innerText = (status.configuration?.admin_listen || []).join(', ');
        if (requestsEl) requestsEl.innerText = (status.server?.total_requests || 0).toString();
        if (servicesEl) servicesEl.innerText = (status.database?.services || 0).toString();

    } catch (e) {
        console.error('Dashboard load failed', e);
    }
}
