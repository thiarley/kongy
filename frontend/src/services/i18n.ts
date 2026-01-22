import { STORAGE_KEYS } from '../utils/constants';

const SUPPORTED_LOCALES = ['pt-BR', 'en-US'] as const;
const DEFAULT_LOCALE = 'pt-BR';

class I18n {
    currentLocale: string;
    translations: any;
    private _initialized: boolean = false;

    constructor() {
        this.currentLocale = this.getStoredLocale() || this.detectLocale();
        this.translations = {};
    }

    /**
     * Get stored locale from localStorage
     */
    getStoredLocale(): string | null {
        return localStorage.getItem(STORAGE_KEYS.LOCALE);
    }

    /**
     * Detect locale from browser settings
     */
    detectLocale(): string {
        const browserLang = navigator.language || (navigator as any).userLanguage;
        const match = SUPPORTED_LOCALES.find(l => browserLang.startsWith(l.split('-')[0]));
        return match || DEFAULT_LOCALE;
    }

    /**
     * Initialize i18n - must be called before using translations
     */
    async init() {
        if (this._initialized) return;

        try {
            await this.loadLocale(this.currentLocale);
        } catch (e) {
            console.error('Failed to load initial locale', e);
            if (this.currentLocale !== DEFAULT_LOCALE) {
                await this.loadLocale(DEFAULT_LOCALE);
            }
        }

        this.updateDocumentLang();
        this.updateUI();
        this._initialized = true;
    }

    /**
     * Load translations for a locale
     */
    async loadLocale(locale: string) {
        try {
            const response = await fetch(`/locales/${locale}.json`);
            if (!response.ok) {
                throw new Error(`Could not load locale ${locale}`);
            }
            this.translations = await response.json();
            this.currentLocale = locale;
            localStorage.setItem(STORAGE_KEYS.LOCALE, locale);
        } catch (error) {
            console.warn(`Failed to load ${locale}, falling back to ${DEFAULT_LOCALE}`);
            if (locale !== DEFAULT_LOCALE) {
                await this.loadLocale(DEFAULT_LOCALE);
            }
        }
    }

    /**
     * Change current locale
     */
    async setLocale(locale: string) {
        if (!SUPPORTED_LOCALES.includes(locale as any)) {
            console.warn(`Unsupported locale: ${locale}`);
            return;
        }

        await this.loadLocale(locale);
        this.updateDocumentLang();
        this.updateUI();
    }

    /**
     * Update document lang attribute
     */
    updateDocumentLang() {
        document.documentElement.lang = this.currentLocale;
    }

    /**
     * Get translation by key path (e.g., 'auth.login')
     */
    t(key: string, params: Record<string, any> = {}): string {
        const keys = key.split('.');
        let value: any = this.translations;

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                console.warn(`Missing translation: ${key}`);
                return key;
            }
        }

        if (typeof value !== 'string') return key;

        // Replace placeholders like {name}
        return value.replace(/\{(\w+)\}/g, (_: string, match: string) => {
            return params[match] !== undefined ? params[match] : `{${match}}`;
        });
    }

    /**
     * Update all elements with data-i18n attributes
     */
    updateUI() {
        // Update text content
        document.querySelectorAll('[data-i18n]').forEach((element) => {
            const key = element.getAttribute('data-i18n');
            const attr = element.getAttribute('data-i18n-attr') || 'textContent';
            if (key) {
                (element as any)[attr] = this.t(key);
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key && element instanceof HTMLInputElement) {
                element.placeholder = this.t(key);
            }
        });

        // Update titles/tooltips
        document.querySelectorAll('[data-i18n-title]').forEach((element) => {
            const key = element.getAttribute('data-i18n-title');
            if (key) {
                (element as HTMLElement).title = this.t(key);
            }
        });

        // Update aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
            const key = element.getAttribute('data-i18n-aria');
            if (key) {
                element.setAttribute('aria-label', this.t(key));
            }
        });
    }

    /**
     * Get list of available locales
     */
    getAvailableLocales() {
        return SUPPORTED_LOCALES.map(code => ({
            code,
            name: new Intl.DisplayNames([code], { type: 'language' }).of(code.split('-')[0]) || code,
            nativeName: new Intl.DisplayNames([code], { type: 'language' }).of(code.split('-')[0]) || code
        }));
    }

    /**
     * Check if i18n is initialized
     */
    isInitialized(): boolean {
        return this._initialized;
    }
}

export const i18n = new I18n();

