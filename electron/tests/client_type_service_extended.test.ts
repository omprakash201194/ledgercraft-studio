/**
 * Client Type Service — Extended tests
 *
 * Covers gaps identified by coverage report:
 *  - getAllClientTypeFields() — happy path + empty result
 *  - updateClientTypeFieldLabel() — field not found throws
 *  - softDeleteClientTypeField() — field not found throws
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── In-memory store (same approach as existing client_type_service.test.ts) ─

let clientTypeFields: any[] = [];

const mockPrepare = vi.fn((sql: string) => ({
    run: (...args: any[]) => {
        if (sql.includes('UPDATE client_type_fields SET label = ?')) {
            const [newLabel, id] = args;
            const f = clientTypeFields.find(f => f.id === id);
            if (f) { f.label = newLabel; return { changes: 1 }; }
            return { changes: 0 };
        }
        if (sql.includes('UPDATE client_type_fields SET is_deleted = 1')) {
            const [id] = args;
            const f = clientTypeFields.find(f => f.id === id);
            if (f) { f.is_deleted = 1; return { changes: 1 }; }
            return { changes: 0 };
        }
        return { changes: 0 };
    },
    all: (...args: any[]) => {
        if (sql.includes('SELECT field_key, MAX(label) as label')) {
            // Return unique active fields
            const seen = new Set<string>();
            return clientTypeFields
                .filter(f => f.is_deleted === 0)
                .filter(f => {
                    if (seen.has(f.field_key)) return false;
                    seen.add(f.field_key);
                    return true;
                })
                .sort((a, b) => a.label.localeCompare(b.label))
                .map(f => ({ field_key: f.field_key, label: f.label, data_type: f.data_type }));
        }
        return [];
    },
}));

vi.mock('../database', () => ({
    database: { getConnection: () => ({ prepare: mockPrepare }) },
}));
vi.mock('../auth', () => ({
    getCurrentUser: () => ({ id: 'admin', username: 'admin', role: 'ADMIN' }),
}));

import {
    getAllClientTypeFields,
    updateClientTypeFieldLabel,
    softDeleteClientTypeField,
} from '../clientTypeService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Client Type Service — extended', () => {
    beforeEach(() => {
        clientTypeFields = [];
        vi.clearAllMocks();
    });

    // ── getAllClientTypeFields() ───────────────────────────────────────────────

    describe('getAllClientTypeFields()', () => {
        it('returns empty array when no fields exist', () => {
            const result = getAllClientTypeFields();
            expect(result).toEqual([]);
        });

        it('returns unique active fields across all client types', () => {
            clientTypeFields = [
                { id: 'f1', client_type_id: 'ct1', field_key: 'pan', label: 'PAN', data_type: 'text', is_deleted: 0 },
                { id: 'f2', client_type_id: 'ct2', field_key: 'email', label: 'Email', data_type: 'email', is_deleted: 0 },
                { id: 'f3', client_type_id: 'ct1', field_key: 'pan', label: 'PAN Number', data_type: 'text', is_deleted: 0 }, // duplicate key
            ];

            const result = getAllClientTypeFields();

            // Unique by field_key, sorted by label
            expect(result).toHaveLength(2);
            const keys = result.map(f => f.field_key);
            expect(keys).toContain('pan');
            expect(keys).toContain('email');
        });

        it('excludes soft-deleted fields', () => {
            clientTypeFields = [
                { id: 'f1', client_type_id: 'ct1', field_key: 'pan', label: 'PAN', data_type: 'text', is_deleted: 1 },
                { id: 'f2', client_type_id: 'ct1', field_key: 'email', label: 'Email', data_type: 'email', is_deleted: 0 },
            ];

            const result = getAllClientTypeFields();

            expect(result).toHaveLength(1);
            expect(result[0].field_key).toBe('email');
        });
    });

    // ── updateClientTypeFieldLabel() ──────────────────────────────────────────

    describe('updateClientTypeFieldLabel()', () => {
        it('throws when field is not found', () => {
            expect(() => {
                updateClientTypeFieldLabel('nonexistent-id', 'New Label');
            }).toThrow(/field not found/i);
        });

        it('throws when new label is empty', () => {
            expect(() => {
                updateClientTypeFieldLabel('any-id', '');
            }).toThrow(/new label is required/i);
        });

        it('throws when new label is whitespace only', () => {
            expect(() => {
                updateClientTypeFieldLabel('any-id', '   ');
            }).toThrow(/new label is required/i);
        });

        it('updates label successfully when field exists', () => {
            clientTypeFields = [
                { id: 'f1', client_type_id: 'ct1', field_key: 'pan', label: 'PAN', data_type: 'text', is_deleted: 0 },
            ];

            expect(() => {
                updateClientTypeFieldLabel('f1', 'PAN Number');
            }).not.toThrow();

            expect(clientTypeFields[0].label).toBe('PAN Number');
        });
    });

    // ── softDeleteClientTypeField() ───────────────────────────────────────────

    describe('softDeleteClientTypeField()', () => {
        it('throws when field is not found', () => {
            expect(() => {
                softDeleteClientTypeField('nonexistent-id');
            }).toThrow(/field not found/i);
        });

        it('soft-deletes the field successfully', () => {
            clientTypeFields = [
                { id: 'f1', client_type_id: 'ct1', field_key: 'pan', label: 'PAN', data_type: 'text', is_deleted: 0 },
            ];

            expect(() => {
                softDeleteClientTypeField('f1');
            }).not.toThrow();

            expect(clientTypeFields[0].is_deleted).toBe(1);
        });
    });
});
