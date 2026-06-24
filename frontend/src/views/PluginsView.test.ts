/**
 * Tests for PluginsView.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
    api: {
        createPlugin: vi.fn()
    }
}));

vi.mock('../utils', () => ({
    showFieldError: vi.fn(),
    showToast: vi.fn(),
    setBusy: vi.fn(),
    getPluginIcon: () => '🔌',
    runAction: (action: Function) => action()
}));

describe('PluginsView', () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('should correctly harvest form data including nested fields and integer arrays', async () => {
        // Setup DOM elements representing the plugin configuration form
        const modal = document.createElement('div');
        modal.id = 'pluginConfigModal';
        modal.dataset.pluginName = 'proxy-cache';
        modal.dataset.pluginId = '';
        modal.dataset.entityType = 'route';
        modal.dataset.entityId = 'route-123';
        modal.dataset.mode = '';

        // Add inputs
        modal.innerHTML = `
            <input class="plugin-config-field" data-field="cache_ttl" data-type="number" value="300">
            <input class="checkbox-label plugin-config-field" data-field="cache_control" data-type="boolean" type="checkbox" checked>
            <input class="plugin-config-field" data-field="response_code" data-type="array" data-element-type="integer" value="200, 301, 404">
            <input class="plugin-config-field" data-field="request_method" data-type="array" data-element-type="string" value="GET, HEAD">
            <input class="plugin-config-field" data-field="memory.dictionary_name" value="kong_db_cache">
            <button id="savePluginConfigBtn">Save</button>
        `;
        document.body.appendChild(modal);

        // Setup mock response
        vi.mocked(api.createPlugin).mockResolvedValue({ id: 'new-plugin-id' });

        // Import the view logic
        const { handleSavePluginConfig } = await import('./PluginsView');
        const mockUI = {
            closeModal: vi.fn(),
            renderRoutePluginsList: vi.fn()
        };

        // Trigger save
        await handleSavePluginConfig(mockUI as any);

        // Assert correct payload was created and sent to the API
        expect(api.createPlugin).toHaveBeenCalled();
        const payload = vi.mocked(api.createPlugin).mock.calls[0][0] as any;
        expect(payload).toBeDefined();
        expect(payload.name).toBe('proxy-cache');
        expect(payload.config.cache_ttl).toBe(300);
        expect(payload.config.cache_control).toBe(true);
        expect(payload.config.response_code).toEqual([200, 301, 404]);
        expect(payload.config.request_method).toEqual(['GET', 'HEAD']);
        expect(payload.config.memory).toEqual({ dictionary_name: 'kong_db_cache' });
    });
});
