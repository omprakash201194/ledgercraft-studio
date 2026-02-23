
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Fake Database & Auth ────────────────────────

let clientCategories: any[] = [];
let clients: any[] = [];
let clientFieldValues: any[] = [];
let clientTypes: any[] = [{ id: 'type-1', name: 'Individual' }];
let clientTypeFields: any[] = [
    { id: 'field-1', client_type_id: 'type-1', field_key: 'pan_number', label: 'PAN', data_type: 'text', is_required: 0, is_deleted: 0 },
    { id: 'field-2', client_type_id: 'type-1', field_key: 'name', label: 'Name', data_type: 'text', is_required: 0, is_deleted: 0 }
];

const mockCurrentUser = { role: 'ADMIN', username: 'admin' };

const mockRun = vi.fn();
const mockGet = vi.fn();
const mockAll = vi.fn();
const mockTransact = vi.fn((fn) => fn);

// Mock behavior logic
const mockPrepare = vi.fn((sql: string) => {
    return {
        run: (...args: any[]) => {
            mockRun(sql, args);

            if (sql.includes('INSERT INTO client_categories')) {
                const [id, name, parent_id, is_deleted, created_at] = args;
                clientCategories.push({ id, name, parent_id, is_deleted: 0, created_at: args[3] });
                return { changes: 1 };
            }

            if (sql.includes('INSERT INTO clients')) {
                // params: id, name, type, cat, is_deleted (0), created_at, updated_at
                // Service calls: .run(id, name, type, cat, now, now)
                // The query string has "0" hardcoded for is_deleted.
                // So args are: id, name, type, cat, created, updated
                clients.push({ id: args[0], name: args[1], client_type_id: args[2], category_id: args[3], is_deleted: 0, created_at: args[4], updated_at: args[5] });
                return { changes: 1 };
            }

            if (sql.includes('INSERT INTO client_field_values')) {
                const [id, client_id, field_id, value] = args;
                clientFieldValues.push({ id, client_id, field_id, value });
                return { changes: 1 };
            }

            if (sql.includes('UPDATE clients SET is_deleted = 1')) {
                const [id] = args;
                const c = clients.find(x => x.id === id);
                if (c) {
                    c.is_deleted = 1;
                    return { changes: 1 };
                }
                return { changes: 0 };
            }

            if (sql.includes('UPDATE clients SET name =')) {
                const [name, cat, updated, id] = args;
                const c = clients.find(x => x.id === id);
                if (c) {
                    c.name = name;
                    c.category_id = cat;
                    c.updated_at = updated;
                    return { changes: 1 };
                }
                return { changes: 0 };
            }

            if (sql.includes('UPDATE client_field_values SET value = ?')) {
                const [val, id] = args;
                const rec = clientFieldValues.find(r => r.id === id);
                if (rec) {
                    rec.value = val;
                    return { changes: 1 };
                }
                return { changes: 0 };
            }

            return { changes: 0 };
        },
        get: (...args: any[]) => {
            mockGet(sql, args);

            if (sql.includes('SELECT id FROM client_types WHERE id = ?')) {
                const [id] = args;
                return clientTypes.find(t => t.id === id);
            }

            // Duplicate check (Found by joining clients and values)
            if (sql.includes('JOIN client_field_values') && sql.includes('FROM clients c')) {
                // params: type_id, field_id, value, (optional: exclude_client_id)
                const [type, fid, val, excludeId] = args;

                const found = clients.find(c => {
                    if (c.client_type_id !== type) return false;
                    if (c.is_deleted === 1) return false;
                    if (excludeId && c.id === excludeId) return false;

                    // check values
                    const hasVal = clientFieldValues.some(v => v.client_id === c.id && v.field_id === fid && v.value === val);
                    return hasVal;
                });

                return found ? { id: found.id } : undefined;
            }

            if (sql.includes('SELECT * FROM clients WHERE id = ?')) {
                const [id] = args;
                if (sql.includes('is_deleted = 0')) {
                    return clients.find(c => c.id === id && c.is_deleted === 0);
                }
                return clients.find(c => c.id === id);
            }

            if (sql.includes('SELECT id FROM client_field_values WHERE client_id = ? AND field_id = ?')) {
                const [cid, fid] = args;
                const found = clientFieldValues.find(v => v.client_id === cid && v.field_id === fid);
                return found ? { id: found.id } : undefined;
            }

            return undefined;
        },
        all: (...args: any[]) => {
            mockAll(sql, args);

            if (sql.includes('SELECT * FROM client_categories')) {
                return clientCategories.filter(c => c.is_deleted === 0);
            }

            if (sql.includes('SELECT id, field_key FROM client_type_fields') || sql.includes('SELECT id, field_key, label, data_type, is_required FROM client_type_fields')) {
                const [tid] = args;
                return clientTypeFields.filter(f => f.client_type_id === tid && f.is_deleted === 0).map(f => ({ id: f.id, field_key: f.field_key, label: f.label, data_type: f.data_type || 'text', is_required: f.is_required || 0 }));
            }

            if (sql.includes('FROM clients c') && sql.includes('LIKE ?')) {
                // Search
                const pattern = args[0].replace(/%/g, ''); // simple contains
                return clients.filter(c => {
                    if (c.is_deleted) return false;
                    const nameMatch = c.name.includes(pattern);
                    const valMatch = clientFieldValues.some(v => v.client_id === c.id && v.value.includes(pattern));
                    return nameMatch || valMatch;
                });
            }

            if (sql.includes('SELECT cfv.value, ctf.field_key')) {
                // getClientById join
                const [cid] = args;
                return clientFieldValues
                    .filter(v => v.client_id === cid)
                    .map(v => {
                        const f = clientTypeFields.find(f => f.id === v.field_id);
                        return { value: v.value, field_key: f ? f.field_key : 'unknown' };
                    });
            }

            return [];
        }
    };
});

vi.mock('../database', () => ({
    database: {
        getConnection: () => ({
            prepare: mockPrepare,
            transaction: mockTransact
        })
    }
}));

vi.mock('../auth', () => ({
    getCurrentUser: () => mockCurrentUser
}));


import {
    createClientCategory,
    getClientCategories,
    createClient,
    searchClients,
    updateClient,
    softDeleteClient,
    getClientById
} from '../clientService';

describe('Client Service', () => {
    beforeEach(() => {
        clientCategories = [];
        clients = [];
        clientFieldValues = [];
        vi.clearAllMocks();

        // Reset Admin User
        mockCurrentUser.role = 'ADMIN';
    });

    it('should allow Admin to create client category', () => {
        const cat = createClientCategory('Legal');
        expect(cat.name).toBe('Legal');
        expect(clientCategories).toHaveLength(1);
    });

    it('should NOT allow Non-Admin to create client category', () => {
        mockCurrentUser.role = 'USER';
        expect(() => {
            createClientCategory('Illegal');
        }).toThrow('Only administrators');
        expect(clientCategories).toHaveLength(0);
    });

    it('should create client with field values', () => {
        const input = {
            name: 'John Doe',
            client_type_id: 'type-1',
            field_values: [
                { field_id: 'field-1', value: 'ABCDE1234F' }, // PAN
                { field_id: 'field-2', value: 'John' }
            ]
        };

        const client = createClient(input);
        expect(client.name).toBe('John Doe');

        const fetched = getClientById(client.id);
        expect(fetched).toBeDefined();
        // @ts-ignore
        expect(fetched.field_values['pan_number']).toBe('ABCDE1234F');
    });

    it('should create client with a category', () => {
        const cat = createClientCategory('VIP Category');

        const client = createClient({
            name: 'VIP Client',
            client_type_id: 'type-1',
            category_id: cat.id,
            field_values: []
        });

        expect(client.category_id).toBe(cat.id);
        const fetched = getClientById(client.id);
        expect(fetched?.category_id).toBe(cat.id);
    });

    it('should update client category correctly', () => {
        const c1 = createClient({ name: 'Regular Client', client_type_id: 'type-1', field_values: [] });
        expect(c1.category_id).toBeNull();

        const cat = createClientCategory('New VIP Category');

        updateClient(c1.id, {
            category_id: cat.id
        });

        const updated = getClientById(c1.id);
        expect(updated?.category_id).toBe(cat.id);
    });

    it('should throw error on Duplicate PAN under same client_type_id', () => {
        // 1. Create first client with PAN
        createClient({
            name: 'Client A',
            client_type_id: 'type-1',
            field_values: [{ field_id: 'field-1', value: 'DUPLICATE' }]
        });

        // 2. Try create second client with SAME PAN
        expect(() => {
            createClient({
                name: 'Client B',
                client_type_id: 'type-1',
                field_values: [{ field_id: 'field-1', value: 'DUPLICATE' }]
            });
        }).toThrow(/Duplicate value for PAN/i);
    });

    it('should search clients by partial Name or PAN', () => {
        const c1 = createClient({ name: 'Alpha Corp', client_type_id: 'type-1', field_values: [] });
        const c2 = createClient({ name: 'Beta Ltd', client_type_id: 'type-1', field_values: [{ field_id: 'field-1', value: 'XYZ789' }] });

        const res1 = searchClients('Alpha');
        expect(res1).toHaveLength(1);
        expect(res1[0].name).toBe('Alpha Corp');

        const res2 = searchClients('XYZ');
        expect(res2).toHaveLength(1);
        expect(res2[0].name).toBe('Beta Ltd');
    });

    it('should update client values correctly', () => {
        const c1 = createClient({ name: 'Old Name', client_type_id: 'type-1', field_values: [{ field_id: 'field-2', value: 'OldVal' }] });

        updateClient(c1.id, {
            name: 'New Name',
            field_values: [{ field_id: 'field-2', value: 'NewVal' }]
        });

        const updated = getClientById(c1.id);
        expect(updated?.name).toBe('New Name');
        // @ts-ignore
        expect(updated?.field_values['name']).toBe('NewVal');
    });

    it('should soft delete client and hide from search', () => {
        const c1 = createClient({ name: 'To Delete', client_type_id: 'type-1', field_values: [] });

        expect(searchClients('Delete')).toHaveLength(1);

        softDeleteClient(c1.id);

        expect(searchClients('Delete')).toHaveLength(0);

        // getClientById should return null or ignore deleted
        expect(getClientById(c1.id)).toBeNull();
    });

    it('should NOT allow Non-Admin to delete client', () => {
        const c1 = createClient({ name: 'Cant Touch This', client_type_id: 'type-1', field_values: [] });

        mockCurrentUser.role = 'USER';
        expect(() => {
            softDeleteClient(c1.id);
        }).toThrow('Only administrators');
    });
});
