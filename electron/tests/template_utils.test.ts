/**
 * Template Utils Unit Tests
 *
 * Validates:
 * - extractPlaceholders() returns keys found in docx text
 * - extractPlaceholders() deduplicates keys
 * - extractPlaceholders() returns [] on parse error (graceful fallback)
 * - extractPlaceholders() trims whitespace from keys
 * - extractPlaceholders() handles empty text
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module-level mock controls ───────────────────────────────────────────────
// Must be module-level (not vi.hoisted) to be captured inside vi.mock class bodies

let mockDocFullText = '';
let mockDocThrow = false;

vi.mock('pizzip', () => ({
    default: class { constructor() {} },
}));

vi.mock('docxtemplater', () => ({
    default: class {
        constructor() {
            if (mockDocThrow) throw new Error('Invalid .docx file');
        }
        getFullText() { return mockDocFullText; }
        render() {}
    },
}));

import { extractPlaceholders } from '../templateUtils';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('templateUtils — extractPlaceholders()', () => {

    beforeEach(() => {
        mockDocFullText = '';
        mockDocThrow = false;
    });

    it('should return an empty array when document has no placeholders', () => {
        mockDocFullText = 'This is a plain document with no placeholders.';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toEqual([]);
    });

    it('should extract a single placeholder', () => {
        mockDocFullText = 'Dear {{CLIENT_NAME}}, please find...';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toEqual(['CLIENT_NAME']);
    });

    it('should extract multiple placeholders', () => {
        mockDocFullText = '{{INVOICE_DATE}} — Amount: {{TOTAL_AMOUNT}} — Client: {{CLIENT_NAME}}';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toContain('INVOICE_DATE');
        expect(result).toContain('TOTAL_AMOUNT');
        expect(result).toContain('CLIENT_NAME');
        expect(result).toHaveLength(3);
    });

    it('should deduplicate repeated placeholders', () => {
        mockDocFullText = '{{CLIENT_NAME}} ... {{CLIENT_NAME}} ... {{CLIENT_NAME}}';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toEqual(['CLIENT_NAME']);
        expect(result).toHaveLength(1);
    });

    it('should trim whitespace from placeholder keys', () => {
        mockDocFullText = '{{ CLIENT_NAME }} and {{  INVOICE_DATE  }}';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toContain('CLIENT_NAME');
        expect(result).toContain('INVOICE_DATE');
    });

    it('should return empty array when document text is empty', () => {
        mockDocFullText = '';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toEqual([]);
    });

    it('should return empty array when Docxtemplater throws', () => {
        mockDocThrow = true;

        const result = extractPlaceholders(Buffer.from('corrupt'));

        expect(result).toEqual([]);
    });

    it('should handle a real-world invoice template with mixed content', () => {
        mockDocFullText =
            'INVOICE\n' +
            'Date: {{INVOICE_DATE}}\n' +
            'Invoice No: {{INVOICE_NUMBER}}\n' +
            'Client: {{CLIENT_NAME}}\n' +
            'PAN: {{PAN_NUMBER}}\n' +
            'Amount: {{TOTAL_AMOUNT}}\n' +
            'Tax (18%): {{TAX_AMOUNT}}\n' +
            'Grand Total: {{GRAND_TOTAL}}\n';

        const result = extractPlaceholders(Buffer.from('fake'));

        expect(result).toHaveLength(7);
        expect(result).toContain('INVOICE_DATE');
        expect(result).toContain('INVOICE_NUMBER');
        expect(result).toContain('CLIENT_NAME');
        expect(result).toContain('GRAND_TOTAL');
    });
});
