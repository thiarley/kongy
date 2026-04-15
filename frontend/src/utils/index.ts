import { PLUGIN_ICONS } from './constants';

const incrementalRenderTokens = new Map<string, number>();

// ==================== Toast Notifications ====================

/**
 * Show toast notification using Toastify (assumed global or imported)
 */
declare const Toastify: any;

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const gradients: Record<string, string> = {
        success: "linear-gradient(to right, #00b09b, #96c93d)",
        error: "linear-gradient(to right, #ff5f6d, #ffc371)",
        warning: "linear-gradient(to right, #f8b500, #fceabb)",
        info: "linear-gradient(to right, #a18cd1, #fbc2eb)"
    };

    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3500,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: {
                background: gradients[type] || gradients.info,
                fontFamily: "'Inter', sans-serif",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            },
        }).showToast();
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

// ==================== Loading States ====================

export function setBusy(element: HTMLElement | null, isBusy: boolean) {
    if (!element) return;

    if (isBusy) {
        element.classList.add('busy', 'disabled', 'opacity-50');
        element.setAttribute('disabled', 'true');
        element.dataset.originalText = element.innerHTML;

        if (element.tagName === 'BUTTON') {
            element.innerHTML = '<span class="spinner"></span> Aguarde...';
        }

        document.body.style.cursor = 'wait';
    } else {
        element.classList.remove('busy', 'disabled', 'opacity-50');
        element.removeAttribute('disabled');

        if (element.dataset.originalText) {
            element.innerHTML = element.dataset.originalText;
            delete element.dataset.originalText;
        }

        document.body.style.cursor = 'default';
    }
}

export function setContainerLoading(container: HTMLElement | null, isLoading: boolean) {
    if (!container) return;

    const existingOverlay = container.querySelector('.loading-overlay');

    if (isLoading) {
        if (!existingOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<span class="spinner spinner-lg"></span>';
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
    } else {
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }
}

// ==================== Formatters ====================

export function formatTime(timestamp?: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('pt-BR');
}

export function formatDate(timestamp?: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
}

export function escapeHtml(unsafe?: string): string {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function truncate(text: string, maxLength = 50): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ==================== Plugin Helpers ====================

export function getPluginIcon(pluginName: string): string {
    return PLUGIN_ICONS[pluginName] || PLUGIN_ICONS.default;
}

export function renderPluginIcons(plugins: any[]): string {
    if (!plugins || plugins.length === 0) return '';

    return plugins
        .filter(p => p.enabled)
        .map(p => `<span title="${p.name}">${getPluginIcon(p.name)}</span>`)
        .join(' ');
}

// ==================== Array/Object Helpers ====================

export function parseCommaSeparated(str?: string): string[] {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
}

export function joinWithComma(arr?: string[]): string {
    if (!arr || !Array.isArray(arr)) return '';
    return arr.join(', ');
}

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// ==================== Validation ====================

export function isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ==================== DOM Helpers ====================

export function createElement(tag: string, attrs: Record<string, any> = {}, ...children: (string | Node)[]): HTMLElement {
    const el = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key.startsWith('on')) {
            el.addEventListener(key.substring(2).toLowerCase(), value);
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([k, v]) => el.dataset[k] = v as string);
        } else {
            el.setAttribute(key, value);
        }
    });

    children.forEach(child => {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    });

    return el;
}

export function $<T extends HTMLElement = HTMLElement>(selector: string, context: Document | HTMLElement = document): T | null {
    return context.querySelector(selector) as T;
}

export function $$<T extends HTMLElement = HTMLElement>(selector: string, context: Document | HTMLElement = document): T[] {
    return Array.from(context.querySelectorAll(selector)) as T[];
}

// ==================== Debounce/Throttle ====================

export function debounce(fn: Function, delay = 300) {
    let timeoutId: any;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export function throttle(fn: Function, limit = 300) {
    let inThrottle: boolean;
    return (...args: any[]) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== Clipboard ====================

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado!', 'success');
        return true;
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('Falha ao copiar', 'error');
        return false;
    }
}

// ==================== Export/Import ====================

export function downloadJson(data: any, filename = 'export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// ==================== Incremental Rendering ====================

interface IncrementalRenderOptions<T> {
    key: string;
    container: HTMLElement;
    items: T[];
    renderItem: (item: T, index: number) => HTMLElement;
    emptyHtml?: string;
    batchSize?: number;
    onComplete?: () => void;
}

function nextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

export function renderIncrementally<T>({
    key,
    container,
    items,
    renderItem,
    emptyHtml,
    batchSize = 40,
    onComplete
}: IncrementalRenderOptions<T>) {
    const token = (incrementalRenderTokens.get(key) || 0) + 1;
    incrementalRenderTokens.set(key, token);

    container.innerHTML = '';

    if (items.length === 0) {
        if (emptyHtml) {
            container.innerHTML = emptyHtml;
        }
        onComplete?.();
        return;
    }

    void (async () => {
        for (let index = 0; index < items.length; index += batchSize) {
            if (incrementalRenderTokens.get(key) !== token) {
                return;
            }

            const fragment = document.createDocumentFragment();
            const slice = items.slice(index, index + batchSize);
            slice.forEach((item, sliceIndex) => {
                fragment.appendChild(renderItem(item, index + sliceIndex));
            });
            container.appendChild(fragment);

            if (index + batchSize < items.length) {
                await nextFrame();
            }
        }

        if (incrementalRenderTokens.get(key) === token) {
            onComplete?.();
        }
    })();
}
