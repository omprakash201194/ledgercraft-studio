/**
 * Renderer — dateUtils unit tests
 *
 * Covers:
 *  - formatDate() — all three format variants, invalid date, empty string
 *  - formatDateTime() — valid date with time, empty string, invalid date
 */

import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './dateUtils';

describe('renderer/src/utils/dateUtils', () => {

    // ── formatDate() ──────────────────────────────────────────────────────────

    describe('formatDate()', () => {
        it('returns empty string for empty/falsy input', () => {
            expect(formatDate('', 'DD-MM-YYYY')).toBe('');
        });

        it('returns the input string when date is invalid', () => {
            expect(formatDate('not-a-date', 'DD-MM-YYYY')).toBe('not-a-date');
        });

        it('formats date as DD-MM-YYYY (default)', () => {
            expect(formatDate('2024-06-15', 'DD-MM-YYYY')).toBe('15-06-2024');
        });

        it('formats date as MM-DD-YYYY', () => {
            expect(formatDate('2024-06-15', 'MM-DD-YYYY')).toBe('06-15-2024');
        });

        it('formats date as YYYY-MM-DD', () => {
            expect(formatDate('2024-06-15', 'YYYY-MM-DD')).toBe('2024-06-15');
        });

        it('pads single-digit day and month with leading zero', () => {
            // June 5 → day=05, month=06
            expect(formatDate('2024-06-05', 'DD-MM-YYYY')).toBe('05-06-2024');
        });

        it('accepts a Date object as input', () => {
            const d = new Date('2024-03-01T00:00:00.000Z');
            const result = formatDate(d, 'DD-MM-YYYY');
            // Exact day depends on local timezone, but result must be non-empty
            expect(result).toMatch(/^\d{2}-\d{2}-\d{4}$/);
        });
    });

    // ── formatDateTime() ──────────────────────────────────────────────────────

    describe('formatDateTime()', () => {
        it('returns empty string for empty/falsy input', () => {
            expect(formatDateTime('', 'DD-MM-YYYY')).toBe('');
        });

        it('returns the input string when date is invalid', () => {
            expect(formatDateTime('bad-date', 'DD-MM-YYYY')).toBe('bad-date');
        });

        it('returns date part + time part for valid date string', () => {
            const result = formatDateTime('2024-06-15T10:30:00.000Z', 'DD-MM-YYYY');
            // Should start with the date portion
            expect(result).toMatch(/^\d{2}-\d{2}-\d{4}/);
            // Should have a space followed by time
            expect(result).toContain(' ');
            const parts = result.split(' ');
            expect(parts.length).toBeGreaterThanOrEqual(2);
        });

        it('returns date in MM-DD-YYYY format when specified', () => {
            const result = formatDateTime('2024-06-15T10:30:00.000Z', 'MM-DD-YYYY');
            expect(result).toMatch(/^\d{2}-\d{2}-\d{4}/);
        });

        it('returns date in YYYY-MM-DD format when specified', () => {
            const result = formatDateTime('2024-06-15T10:30:00.000Z', 'YYYY-MM-DD');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
        });
    });
});
