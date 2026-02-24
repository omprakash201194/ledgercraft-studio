
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── In-Memory EAV Store ───────────────────────────────────
let clientTypes: any[] = [];
let clientTypeFields: any[] = [];
let clients: any[] = [];
let clientFieldValues: any[] = [];

// ─── Mock Helpers ─────────────────────────────────────────
const mockCurrentUser = { role: 'ADMIN', username: 'admin' };

const mockPrepare = vi.fn((sql: string) => ({
    run: (...args: any[]) => {
        if (sql.includes('INSERT INTO clients')) {
            clients.push({
                id: args[0], name: args[1], client_type_id: args[2],
                category_id: args[3], is_deleted: 0, created_at: args[4], updated_at: args[5]
            });
            return { changes: 1 };
        }
        if (sql.includes('INSERT INTO client_field_values')) {
            clientFieldValues.push({ id: args[0], client_id: args[1], field_id: args[2], value: args[3] });
            return { changes: 1 };
        }
        if (sql.includes('UPDATE clients SET is_deleted = 1')) {
            const c = clients.find(x => x.id === args[0]);
            if (c) { c.is_deleted = 1; return { changes: 1 }; }
            return { changes: 0 };
        }
        if (sql.includes('UPDATE clients SET name =')) {
            const [name, cat, updated, id] = args;
            const c = clients.find(x => x.id === id);
            if (c) { c.name = name; c.category_id = cat; c.updated_at = updated; return { changes: 1 }; }
            return { changes: 0 };
        }
        if (sql.includes('UPDATE client_field_values SET value = ?')) {
            const rec = clientFieldValues.find(r => r.id === args[1]);
            if (rec) { rec.value = args[0]; return { changes: 1 }; }
            return { changes: 0 };
        }
        if (sql.includes('INSERT INTO client_field_values') && sql.includes('ON CONFLICT')) {
            const existing = clientFieldValues.find(r => r.id === args[0]);
            if (existing) { existing.value = args[3]; } else {
                clientFieldValues.push({ id: args[0], client_id: args[1], field_id: args[2], value: args[3] });
            }
            return { changes: 1 };
        }
        return { changes: 0 };
    },
    get: (...args: any[]) => {
        if (sql.includes('SELECT id FROM client_types WHERE id = ?')) {
            return clientTypes.find(t => t.id === args[0]);
        }
        if (sql.includes('JOIN client_field_values') && sql.includes('FROM clients c')) {
            const [type, fid, val, excludeId] = args;
            const found = clients.find(c => {
                if (c.client_type_id !== type || c.is_deleted === 1) return false;
                if (excludeId && c.id === excludeId) return false;
                return clientFieldValues.some(v => v.client_id === c.id && v.field_id === fid && v.value === val);
            });
            return found ? { id: found.id } : undefined;
        }
        if (sql.includes('SELECT * FROM clients WHERE id = ?')) {
            const c = clients.find(x => x.id === args[0] && x.is_deleted === 0);
            return c || undefined;
        }
        if (sql.includes('SELECT id FROM client_field_values WHERE client_id = ? AND field_id = ?')) {
            return clientFieldValues.find(v => v.client_id === args[0] && v.field_id === args[1]);
        }
        return undefined;
    },
    all: (...args: any[]) => {
        if (sql.includes('SELECT id, field_key, label, data_type, is_required FROM client_type_fields')) {
            return clientTypeFields
                .filter(f => f.client_type_id === args[0] && f.is_deleted === 0)
                .map(f => ({ id: f.id, field_key: f.field_key, label: f.label, data_type: f.data_type, is_required: f.is_required }));
        }
        if (sql.includes('SELECT id, field_key FROM client_type_fields')) {
            return clientTypeFields
                .filter(f => f.client_type_id === args[0])
                .map(f => ({ id: f.id, field_key: f.field_key }));
        }
        if (sql.includes('SELECT cfv.value, ctf.field_key')) {
            return clientFieldValues
                .filter(v => v.client_id === args[0])
                .map(v => {
                    const f = clientTypeFields.find(f => f.id === v.field_id);
                    return { value: v.value, field_key: f ? f.field_key : 'unknown' };
                });
        }
        return [];
    }
}));

vi.mock('../database', () => ({
    database: {
        getConnection: () => ({
            prepare: mockPrepare,
            transaction: (fn: any) => fn
        })
    }
}));

vi.mock('../auth', () => ({
    getCurrentUser: () => mockCurrentUser
}));

import { createClient, getClientById, updateClient, softDeleteClient } from '../clientService';

// ─── Seed Helpers ──────────────────────────────────────────
function seedClientType(id: string, name: string) {
    clientTypes.push({ id, name });
}

function seedField(id: string, clientTypeId: string, fieldKey: string, dataType = 'text', isRequired = 0) {
    clientTypeFields.push({ id, client_type_id: clientTypeId, field_key: fieldKey, data_type: dataType, is_required: isRequired, is_deleted: 0 });
}

// ─── Tests ────────────────────────────────────────────────
describe('clientService – EAV Model', () => {

    beforeEach(() => {
        clientTypes = [];
        clientTypeFields = [];
        clients = [];
        clientFieldValues = [];
        vi.clearAllMocks();
        mockCurrentUser.role = 'ADMIN';

        // Seed default type and fields
        seedClientType('type-1', 'Individual');
        seedField('f-name', 'type-1', 'full_name', 'text', 0);
        seedField('f-pan', 'type-1', 'pan', 'text', 0);
        seedField('f-dob', 'type-1', 'dob', 'date', 0);
        seedField('f-income', 'type-1', 'annual_income', 'number', 0);
    });

    // ─── Create ───────────────────────────────────────────

    describe('Create client with dynamic EAV attributes', () => {
        it('should create client and persist multiple field values', () => {
            const client = createClient({
                name: 'Alice',
                client_type_id: 'type-1',
                field_values: [
                    { field_id: 'f-name', value: 'Alice Sharma' },
                    { field_id: 'f-pan', value: 'ABCDE1234F' },
                ]
            });

            expect(client.id).toBeDefined();
            expect(client.name).toBe('Alice');

            // Verify EAV rows were created
            const storedValues = clientFieldValues.filter(v => v.client_id === client.id);
            expect(storedValues).toHaveLength(2);
            expect(storedValues.find(v => v.field_id === 'f-pan')?.value).toBe('ABCDE1234F');
        });

        it('should create client without optional fields', () => {
            const client = createClient({
                name: 'Bob',
                client_type_id: 'type-1',
                field_values: []
            });

            expect(client.name).toBe('Bob');
            expect(clientFieldValues.filter(v => v.client_id === client.id)).toHaveLength(0);
        });

        it('should trim whitespace from field values', () => {
            const client = createClient({
                name: 'Charlie',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'f-name', value: '  Charlie Doe  ' }]
            });

            const stored = clientFieldValues.find(v => v.field_id === 'f-name' && v.client_id === client.id);
            expect(stored?.value).toBe('Charlie Doe');
        });

        it('should NOT store empty string field values', () => {
            const client = createClient({
                name: 'Dave',
                client_type_id: 'type-1',
                field_values: [
                    { field_id: 'f-pan', value: '' },
                    { field_id: 'f-name', value: 'David' },
                ]
            });

            const stored = clientFieldValues.filter(v => v.client_id === client.id);
            expect(stored).toHaveLength(1); // only 'f-name' stored
            expect(stored[0].field_id).toBe('f-name');
        });
    });

    // ─── Required Field Validation ────────────────────────

    describe('Missing required attribute (edge case)', () => {
        it('should throw error when required field is missing entirely', () => {
            clientTypeFields.find(f => f.field_key === 'pan')!.is_required = 1;

            expect(() => {
                createClient({
                    name: 'Missing PAN',
                    client_type_id: 'type-1',
                    field_values: [] // PAN not provided at all
                });
            }).toThrow('Required field "pan" is missing');
        });

        it('should throw error when required field has empty value', () => {
            clientTypeFields.find(f => f.field_key === 'pan')!.is_required = 1;

            expect(() => {
                createClient({
                    name: 'Empty PAN',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-pan', value: '   ' }] // blank whitespace
                });
            }).toThrow('Required field "pan" is missing');
        });

        it('should succeed when all required fields are provided', () => {
            clientTypeFields.find(f => f.field_key === 'pan')!.is_required = 1;

            expect(() => {
                createClient({
                    name: 'Valid Client',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-pan', value: 'VALID1234X' }]
                });
            }).not.toThrow();
        });
    });

    // ─── Data Type Validation ─────────────────────────────

    describe('Validate type constraints (edge case)', () => {
        it('should throw error when number field receives non-numeric value', () => {
            expect(() => {
                createClient({
                    name: 'Bad Number',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-income', value: 'not-a-number' }]
                });
            }).toThrow('Field "annual_income" expects a numeric value');
        });

        it('should accept valid numeric string for number field', () => {
            expect(() => {
                createClient({
                    name: 'Good Number',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-income', value: '150000' }]
                });
            }).not.toThrow();
        });

        it('should throw error when date field receives invalid date', () => {
            expect(() => {
                createClient({
                    name: 'Bad Date',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-dob', value: 'not-a-date' }]
                });
            }).toThrow('Field "dob" expects a valid date');
        });

        it('should accept valid ISO date string for date field', () => {
            expect(() => {
                createClient({
                    name: 'Good Date',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-dob', value: '1990-05-15' }]
                });
            }).not.toThrow();
        });
    });

    // ─── Duplicate Attribute Key ──────────────────────────

    describe('Duplicate attribute key (edge case)', () => {
        it('should throw error on duplicate PAN value for same client type', () => {
            createClient({
                name: 'First Client',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'f-pan', value: 'ABCDE1234F' }]
            });

            expect(() => {
                createClient({
                    name: 'Second Client',
                    client_type_id: 'type-1',
                    field_values: [{ field_id: 'f-pan', value: 'ABCDE1234F' }]
                });
            }).toThrow(/Duplicate value for PAN/i);
        });

        it('should allow same PAN value for different client types', () => {
            seedClientType('type-2', 'Corporate');
            seedField('f-pan2', 'type-2', 'pan', 'text', 0);

            createClient({
                name: 'Individual Client',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'f-pan', value: 'SHARED1234F' }]
            });

            // Same PAN but different type – should be allowed
            expect(() => {
                createClient({
                    name: 'Corporate Client',
                    client_type_id: 'type-2',
                    field_values: [{ field_id: 'f-pan2', value: 'SHARED1234F' }]
                });
            }).not.toThrow();
        });
    });

    // ─── Update EAV Attributes ────────────────────────────

    describe('Update EAV attributes', () => {
        it('should update existing field value in-place', () => {
            const client = createClient({
                name: 'Update Test',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'f-name', value: 'OldName' }]
            });

            updateClient(client.id, {
                field_values: [{ field_id: 'f-name', value: 'NewName' }]
            });

            const fv = clientFieldValues.find(v => v.client_id === client.id && v.field_id === 'f-name');
            expect(fv?.value).toBe('NewName');
        });

        it('should insert new field value when it did not exist before', () => {
            const client = createClient({
                name: 'No PAN Initially',
                client_type_id: 'type-1',
                field_values: []
            });

            updateClient(client.id, {
                field_values: [{ field_id: 'f-pan', value: 'NEWPAN1234' }]
            });

            const fv = clientFieldValues.find(v => v.client_id === client.id && v.field_id === 'f-pan');
            expect(fv?.value).toBe('NEWPAN1234');
        });

        it('should update client name via update', () => {
            const client = createClient({
                name: 'Old Name',
                client_type_id: 'type-1',
                field_values: []
            });

            updateClient(client.id, { name: 'New Name' });

            const updated = clients.find(c => c.id === client.id);
            expect(updated?.name).toBe('New Name');
        });
    });

    // ─── Retrieve with Merged Fields ──────────────────────

    describe('Retrieve client with merged EAV fields', () => {
        it('should retrieve client with all field_values merged', () => {
            const client = createClient({
                name: 'Full Client',
                client_type_id: 'type-1',
                field_values: [
                    { field_id: 'f-pan', value: 'PANX1234Y' },
                    { field_id: 'f-name', value: 'Full Name' },
                ]
            });

            const fetched = getClientById(client.id);
            expect(fetched).not.toBeNull();
            expect(fetched?.field_values?.['pan']).toBe('PANX1234Y');
            expect(fetched?.field_values?.['full_name']).toBe('Full Name');
        });

        it('should return empty field_values object when no attributes stored', () => {
            const client = createClient({
                name: 'Empty Fields Client',
                client_type_id: 'type-1',
                field_values: []
            });

            const fetched = getClientById(client.id);
            expect(fetched).not.toBeNull();
            expect(fetched?.field_values).toEqual({});
        });

        it('should return null for non-existent client id', () => {
            expect(getClientById('non-existent-id')).toBeNull();
        });
    });

    // ─── Soft Delete ──────────────────────────────────────

    describe('Soft delete client', () => {
        it('should soft delete client and make it invisible via getClientById', () => {
            const client = createClient({
                name: 'To Delete',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'f-name', value: 'Delete Me' }]
            });

            softDeleteClient(client.id);

            // Should not be fetchable
            expect(getClientById(client.id)).toBeNull();

            // Field values should still exist in DB (data preserved)
            const fvs = clientFieldValues.filter(v => v.client_id === client.id);
            expect(fvs.length).toBeGreaterThan(0);
        });

        it('should preserve EAV field values after soft delete', () => {
            const client = createClient({
                name: 'Preserved Data',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'f-pan', value: 'PRESERVE1' }]
            });

            softDeleteClient(client.id);

            const row = clients.find(c => c.id === client.id);
            expect(row?.is_deleted).toBe(1);

            const fv = clientFieldValues.find(v => v.client_id === client.id && v.field_id === 'f-pan');
            expect(fv?.value).toBe('PRESERVE1');
        });

        it('should NOT allow non-ADMIN to soft delete client', () => {
            const client = createClient({
                name: 'Protected',
                client_type_id: 'type-1',
                field_values: []
            });

            mockCurrentUser.role = 'USER';
            expect(() => softDeleteClient(client.id)).toThrow('Only administrators');
        });

        it('should throw if client id not found during deletion', () => {
            expect(() => softDeleteClient('bad-id')).toThrow('Client not found');
        });
    });

    // ─── Invalid Client Type ──────────────────────────────

    describe('Invalid Client Type', () => {
        it('should throw error when client_type_id does not exist', () => {
            expect(() => {
                createClient({
                    name: 'Orphan Client',
                    client_type_id: 'nonexistent-type',
                    field_values: []
                });
            }).toThrow('Invalid Client Type');
        });
    });

    // ─── RBAC ─────────────────────────────────────────────

    describe('RBAC enforcement', () => {
        it('should NOT allow non-ADMIN to create client', () => {
            mockCurrentUser.role = 'USER';
            expect(() => {
                createClient({
                    name: 'Unauthorized',
                    client_type_id: 'type-1',
                    field_values: []
                });
            }).toThrow('Only administrators can create clients');
        });

        it('should NOT allow non-ADMIN to update client', () => {
            mockCurrentUser.role = 'ADMIN';
            const client = createClient({ name: 'Test', client_type_id: 'type-1', field_values: [] });

            mockCurrentUser.role = 'USER';
            expect(() => updateClient(client.id, { name: 'Hacked' })).toThrow('Only administrators');
        });
    });
});
