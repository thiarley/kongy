/**
 * Tests for utils/index.ts - Utility Functions
 */
import { describe, it, expect, vi } from 'vitest';
import { escapeHtml, truncate, formatDate, runAction, setBusy, validateRequiredFields } from './index';

describe('Utils', () => {
    describe('escapeHtml', () => {
        it('should escape HTML entities', () => {
            expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
            expect(escapeHtml('a & b')).toBe('a &amp; b');
            expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
        });

        it('should handle empty string', () => {
            expect(escapeHtml('')).toBe('');
        });
    });

    describe('truncate', () => {
        it('should truncate long strings', () => {
            expect(truncate('hello world', 5)).toBe('hello...');
        });

        it('should not truncate short strings', () => {
            expect(truncate('hello', 10)).toBe('hello');
        });
    });

    describe('formatDate', () => {
        it('should format timestamp to date string', () => {
            // Jan 15, 2024 00:00:00 UTC
            const timestamp = 1705276800;
            const result = formatDate(timestamp);
            expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
        });
    });

    describe('loading helpers', () => {
        it('should not replace container innerHTML when marking it busy', () => {
            const container = document.createElement('div');
            container.innerHTML = '<button id="child">Click</button>';

            setBusy(container, true);
            setBusy(container, false);

            expect(container.innerHTML).toBe('<button id="child">Click</button>');
            expect(container.querySelector('#child')).not.toBeNull();
        });

        it('should prevent duplicate runAction calls while busy', async () => {
            const button = document.createElement('button');
            button.textContent = 'Save';
            const action = vi.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            const first = runAction(action, { button });
            const second = runAction(action, { button });
            await Promise.all([first, second]);

            expect(action).toHaveBeenCalledTimes(1);
            expect(button.textContent).toBe('Save');
        });
    });

    describe('validation helpers', () => {
        it('should mark required empty fields', () => {
            document.body.innerHTML = `
                <div class="form-group">
                    <input id="requiredField" class="form-control" value="">
                </div>
            `;

            const isValid = validateRequiredFields([
                { id: 'requiredField', message: 'Required' }
            ]);

            expect(isValid).toBe(false);
            expect(document.getElementById('requiredField')?.classList.contains('is-invalid')).toBe(true);
            expect(document.querySelector('.field-error')?.textContent).toBe('Required');
        });
    });
});
