
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// ─── Fake Database Implementation ────────────────────────

// Simple in-memory store
let clientTypes: any[] = [];
let clientTypeFields: any[] = [];

const mockRun = vi.fn();
const mockGet = vi.fn();
const mockAll = vi.fn();

// Mock behavior logic
const mockPrepare = vi.fn((sql: string) => {
    // Return a statement object with run/get/all methods that execute logic based on SQL
    return {
        run: (...args: any[]) => {
            mockRun(sql, args);

            // INSERT client_types
            if (sql.includes('INSERT INTO client_types')) {
                const [id, name, created_at, updated_at] = args;
                clientTypes.push({ id, name, created_at, updated_at });
                return { changes: 1 };
            }

            // INSERT client_type_fields
            if (sql.includes('INSERT INTO client_type_fields')) {
                const [id, client_type_id, label, field_key, data_type, is_required, created_at] = args;
                clientTypeFields.push({
                    id, client_type_id, label, field_key, data_type,
                    is_required, is_deleted: 0, created_at
                });
                return { changes: 1 };
            }

            // UPDATE label
            if (sql.includes('UPDATE client_type_fields SET label = ?')) {
                const [newLabel, id] = args;
                const field = clientTypeFields.find(f => f.id === id);
                if (field) {
                    field.label = newLabel;
                    return { changes: 1 };
                }
                return { changes: 0 };
            }

            // DELETE (Soft)
            if (sql.includes('UPDATE client_type_fields SET is_deleted = 1')) {
                const [id] = args;
                const field = clientTypeFields.find(f => f.id === id);
                if (field) {
                    field.is_deleted = 1;
                    return { changes: 1 };
                }
                return { changes: 0 };
            }

            return { changes: 0 };
        },
        get: (...args: any[]) => {
            mockGet(sql, args);

            // Check duplicate Name
            if (sql.includes('SELECT id FROM client_types WHERE name = ?')) {
                const [name] = args;
                const found = clientTypes.find(t => t.name === name);
                return found ? { id: found.id } : undefined;
            }

            // Check Client Type Exists
            if (sql.includes('SELECT id FROM client_types WHERE id = ?')) {
                const [id] = args;
                const found = clientTypes.find(t => t.id === id);
                return found ? { id: found.id } : undefined;
            }

            // Check Duplicate Field Key
            if (sql.includes('SELECT id FROM client_type_fields WHERE client_type_id = ? AND field_key = ?')) {
                const [typeId, key] = args;
                const found = clientTypeFields.find(f => f.client_type_id === typeId && f.field_key === key);
                return found ? { id: found.id } : undefined;
            }

            return undefined;
        },
        all: (...args: any[]) => {
            mockAll(sql, args);

            // Get All Types
            if (sql.includes('SELECT * FROM client_types ORDER BY name ASC')) {
                return [...clientTypes].sort((a, b) => a.name.localeCompare(b.name));
            }

            // Get Fields
            if (sql.includes('SELECT * FROM client_type_fields')) {
                const [typeId] = args;
                return clientTypeFields
                    .filter(f => f.client_type_id === typeId && f.is_deleted === 0)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at));
            }

            return [];
        }
    };
});

// Mock 'database' module
vi.mock('../database', () => {
    return {
        database: {
            getConnection: () => ({
                prepare: mockPrepare
            })
        }
    };
});

import {
    createClientType,
    getAllClientTypes,
    addClientTypeField,
    getClientTypeFields,
    updateClientTypeFieldLabel,
    softDeleteClientTypeField
} from '../clientTypeService';

describe('Client Type Service', () => {
    beforeEach(() => {
        // Reset in-memory store
        clientTypes = [];
        clientTypeFields = [];
        vi.clearAllMocks();
    });

    it('should create client type successfully', () => {
        const result = createClientType('Individual');
        expect(result.name).toBe('Individual');
        expect(result.id).toBeDefined();

        expect(clientTypes.length).toBe(1);
        expect(clientTypes[0].name).toBe('Individual');
    });

    it('should throw error on duplicate client type name', () => {
        createClientType('Corporate');

        expect(() => {
            createClientType('Corporate');
        }).toThrow('already exists');
    });

    it('should add valid client type field', () => {
        const type = createClientType('Type A');
        const field = addClientTypeField(type.id, {
            label: 'PAN Number',
            field_key: 'pan_number',
            data_type: 'text',
            is_required: true
        });

        expect(field.label).toBe('PAN Number');
        expect(field.field_key).toBe('pan_number');
        expect(field.is_required).toBe(1);

        expect(clientTypeFields.length).toBe(1);
    });

    it('should throw error for invalid field_key format', () => {
        const type = createClientType('Type B');

        expect(() => {
            addClientTypeField(type.id, {
                label: 'Bad Key',
                field_key: 'Invalid Key!', // Spaces and caps not allowed
                data_type: 'text'
            });
        }).toThrow('must contain only lowercase');
    });

    it('should throw error for duplicate field_key in same client type', () => {
        const type = createClientType('Type C');
        addClientTypeField(type.id, { label: 'First', field_key: 'key1', data_type: 'text' });

        expect(() => {
            addClientTypeField(type.id, { label: 'Second', field_key: 'key1', data_type: 'number' });
        }).toThrow('already exists');
    });

    it('should update field label only', () => {
        const type = createClientType('Type D');
        const field = addClientTypeField(type.id, { label: 'Old Label', field_key: 'key_d', data_type: 'text' });

        updateClientTypeFieldLabel(field.id, 'New Label');

        const updatedField = clientTypeFields.find(f => f.id === field.id);
        expect(updatedField.label).toBe('New Label');
    });

    it('should soft delete field and hide from getClientTypeFields', () => {
        const type = createClientType('Type E');
        const field1 = addClientTypeField(type.id, { label: 'F1', field_key: 'f1', data_type: 'text' });
        const field2 = addClientTypeField(type.id, { label: 'F2', field_key: 'f2', data_type: 'text' });

        expect(getClientTypeFields(type.id)).toHaveLength(2);

        softDeleteClientTypeField(field1.id);

        const visibleFields = getClientTypeFields(type.id);
        expect(visibleFields).toHaveLength(1);
        expect(visibleFields[0].field_key).toBe('f2');

        // Verify it still exists in DB but is deleted
        const dbField = clientTypeFields.find(f => f.id === field1.id);
        expect(dbField.is_deleted).toBe(1);
    });

    it('should allow adding new field after soft delete (if key is different)', () => {
        // Note: The requirement "Duplicate field_key... fails" applies to existing records.
        // My implementation checks ALL records (deleted or not) for uniqueness of key.
        // This is safer. So I should NOT be able to re-use the key.
        // But I CAN add a NEW key.

        const type = createClientType('Type F');
        const field = addClientTypeField(type.id, { label: 'F1', field_key: 'f1', data_type: 'text' });
        softDeleteClientTypeField(field.id);

        // Add new field with DIFFERENT key
        expect(() => {
            addClientTypeField(type.id, { label: 'F2', field_key: 'f2', data_type: 'text' });
        }).not.toThrow();

        // Try to re-add deleted key (should fail per my unique constraint check implementation)
        expect(() => {
            addClientTypeField(type.id, { label: 'F1 Again', field_key: 'f1', data_type: 'text' });
        }).toThrow('already exists');
    });
});
