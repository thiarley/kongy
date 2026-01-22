/**
 * Tests for utils/index.ts - Utility Functions
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml, truncate, formatDate } from './index';

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
});
