/**
 * Tests for services/i18n.ts - Internationalization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('I18n', () => {
    let i18n: any;

    beforeEach(async () => {
        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                auth: {
                    login: 'Entrar',
                    logout: 'Sair',
                    welcome: 'Bem-vindo, {name}!'
                },
                common: {
                    save: 'Salvar',
                    cancel: 'Cancelar'
                }
            })
        });

        // Mock localStorage
        const storage: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage[key] || null,
            setItem: (key: string, value: string) => { storage[key] = value; },
            removeItem: (key: string) => { delete storage[key]; }
        });

        // Reset module
        vi.resetModules();
        const module = await import('./i18n');
        i18n = module.i18n;
    });

    describe('init', () => {
        it('should initialize and load translations', async () => {
            await i18n.init();
            expect(i18n.isInitialized()).toBe(true);
        });
    });

    describe('t (translate)', () => {
        it('should translate simple keys', async () => {
            await i18n.init();
            expect(i18n.t('auth.login')).toBe('Entrar');
            expect(i18n.t('common.save')).toBe('Salvar');
        });

        it('should interpolate parameters', async () => {
            await i18n.init();
            expect(i18n.t('auth.welcome', { name: 'João' })).toBe('Bem-vindo, João!');
        });

        it('should return key for missing translations', async () => {
            await i18n.init();
            expect(i18n.t('missing.key')).toBe('missing.key');
        });
    });

    describe('detectLocale', () => {
        it('should detect browser locale', () => {
            const locale = i18n.detectLocale();
            expect(['pt-BR', 'en-US']).toContain(locale);
        });
    });

    describe('getAvailableLocales', () => {
        it('should return list of available locales', () => {
            const locales = i18n.getAvailableLocales();
            expect(locales.length).toBeGreaterThan(0);
            expect(locales[0]).toHaveProperty('code');
        });
    });
});
