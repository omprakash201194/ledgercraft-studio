import { database } from './database';
import { getCurrentUser } from './auth';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────

export interface ClientCategory {
    id: string;
    name: string;
    parent_id: string | null;
    is_deleted: number;
    created_at: string;
}

export interface Client {
    id: string;
    name: string;
    client_type_id: string;
    category_id: string | null;
    is_deleted: number;
    created_at: string;
    updated_at: string;
    // Joined fields
    field_values?: Record<string, string>; // Key: field_key, Value: value
}

export interface ClientFieldValue {
    id: string;
    client_id: string;
    field_id: string;
    value: string;
}

export interface CreateClientInput {
    name: string;
    client_type_id: string;
    category_id?: string | null;
    field_values: { field_id: string; value: string }[];
}

export interface UpdateClientInput {
    name?: string;
    category_id?: string | null;
    field_values?: { field_id: string; value: string }[];
}

// ─── Service Methods ─────────────────────────────────────

/**
 * proper Case Helper
 */
function toProperCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Create a new Client Category.
 * ADMIN only.
 */
export function createClientCategory(name: string, parentId?: string): ClientCategory {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can manage client categories');
    }

    if (!name || name.trim().length === 0) {
        throw new Error('Category name is required');
    }

    const db = database.getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO client_categories (id, name, parent_id, is_deleted, created_at)
        VALUES (?, ?, ?, 0, ?)
    `);

    stmt.run(id, name.trim(), parentId || null, now);

    return {
        id,
        name: name.trim(),
        parent_id: parentId || null,
        is_deleted: 0,
        created_at: now
    };
}

/**
 * Get all active client categories.
 */
export function getClientCategories(): ClientCategory[] {
    const db = database.getConnection();
    return db.prepare('SELECT * FROM client_categories WHERE is_deleted = 0 ORDER BY name ASC').all() as ClientCategory[];
}

/**
 * Rename Client Category.
 * ADMIN only.
 */
export function renameClientCategory(id: string, newName: string): void {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can manage client categories');
    }

    if (!newName || newName.trim().length === 0) {
        throw new Error('Category name is required');
    }

    const db = database.getConnection();
    // Check if exists
    const exists = db.prepare('SELECT id FROM client_categories WHERE id = ? AND is_deleted = 0').get(id);
    if (!exists) throw new Error('Category not found');

    db.prepare('UPDATE client_categories SET name = ? WHERE id = ?').run(newName.trim(), id);
}

/**
 * Delete Client Category.
 * ADMIN only.
 * Must be empty (no subcategories, no clients).
 */
export function deleteClientCategory(id: string): void {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can manage client categories');
    }

    const db = database.getConnection();
    const category = db.prepare('SELECT id FROM client_categories WHERE id = ? AND is_deleted = 0').get(id);
    if (!category) throw new Error('Category not found');

    // Check for subcategories
    const subCount = db.prepare('SELECT COUNT(*) as count FROM client_categories WHERE parent_id = ? AND is_deleted = 0').get(id) as { count: number };
    if (subCount.count > 0) {
        throw new Error('Cannot delete category with subcategories');
    }

    // Check for clients
    const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients WHERE category_id = ? AND is_deleted = 0').get(id) as { count: number };
    if (clientCount.count > 0) {
        throw new Error('Cannot delete category containing clients. Move them first.');
    }

    // Soft delete
    db.prepare('UPDATE client_categories SET is_deleted = 1 WHERE id = ?').run(id);
}

/**
 * Create a new Client.
 * ADMIN only.
 * Enforces strict PAN Uniqueness for fields with key 'pan' or 'pan_number'.
 */
export function createClient(input: CreateClientInput): Client {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can create clients');
    }

    if (!input.name || input.name.trim().length === 0) {
        throw new Error('Client name is required');
    }
    if (!input.client_type_id) {
        throw new Error('Client Type is required');
    }

    const db = database.getConnection();

    // Validate Client Type exists
    const clientType = db.prepare('SELECT id FROM client_types WHERE id = ?').get(input.client_type_id);
    if (!clientType) {
        throw new Error('Invalid Client Type');
    }

    // Check PAN Uniqueness constraints
    // We need to know which fields are PAN fields.
    // For now, checks against field_key 'pan', 'pan_number', 'tan', 'tan_number', 'gst', 'gst_number'
    // Actually, let's look up the keys for the provided field_ids.

    // Get all fields for this client type to map ID -> Key
    const typeFields = db.prepare('SELECT id, field_key FROM client_type_fields WHERE client_type_id = ?').all(input.client_type_id) as { id: string, field_key: string }[];
    const fieldMap = new Map(typeFields.map(f => [f.id, f.field_key]));

    const uniqueKeys = ['pan', 'pan_number', 'tan', 'tan_number', 'gst', 'aadhaar'];

    for (const fv of input.field_values) {
        const key = fieldMap.get(fv.field_id);
        if (key && uniqueKeys.includes(key)) {
            // Check if ANY other client (non-deleted) of SAME TYPE has this value
            const duplicate = db.prepare(`
                SELECT c.id 
                FROM clients c
                JOIN client_field_values cfv ON c.id = cfv.client_id
                WHERE c.client_type_id = ? 
                AND c.is_deleted = 0
                AND cfv.field_id = ?
                AND cfv.value = ?
            `).get(input.client_type_id, fv.field_id, fv.value.trim());

            if (duplicate) {
                throw new Error(`Duplicate value for ${key.toUpperCase()}: ${fv.value}`);
            }
        }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const insertClient = db.transaction(() => {
        db.prepare(`
            INSERT INTO clients (id, name, client_type_id, category_id, is_deleted, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        `).run(id, input.name.trim(), input.client_type_id, input.category_id || null, now, now);

        const insertVal = db.prepare(`
            INSERT INTO client_field_values (id, client_id, field_id, value)
            VALUES (?, ?, ?, ?)
        `);

        for (const fv of input.field_values) {
            if (fv.value && fv.value.trim().length > 0) {
                insertVal.run(uuidv4(), id, fv.field_id, fv.value.trim());
            }
        }
    });

    insertClient();

    return {
        id,
        name: input.name.trim(),
        client_type_id: input.client_type_id,
        category_id: input.category_id || null, // Ensure explicit null if undefined
        is_deleted: 0,
        created_at: now,
        updated_at: now
    };
}

/**
 * Search clients by Name or Field Value (like PAN).
 */
export function searchClients(query: string): Client[] {
    const db = database.getConnection();
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) return [];

    const sql = `
        SELECT DISTINCT c.* 
        FROM clients c
        LEFT JOIN client_field_values cfv ON c.id = cfv.client_id
        WHERE c.is_deleted = 0
        AND (
            c.name LIKE ? 
            OR cfv.value LIKE ?
        )
        ORDER BY c.name ASC
        LIMIT 50
    `;

    const pattern = `%${trimmedQuery}%`;
    return db.prepare(sql).all(pattern, pattern) as Client[];
}

/**
 * Get Client by ID with all field values.
 */
export function getClientById(clientId: string): Client | null {
    const db = database.getConnection();
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND is_deleted = 0').get(clientId) as Client;

    if (!client) return null;

    const values = db.prepare(`
        SELECT cfv.value, ctf.field_key
        FROM client_field_values cfv
        JOIN client_type_fields ctf ON cfv.field_id = ctf.id
        WHERE cfv.client_id = ?
    `).all(clientId) as { value: string, field_key: string }[];

    client.field_values = values.reduce((acc, curr) => {
        acc[curr.field_key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    return client;
}

/**
 * Update Client.
 * ADMIN only.
 */
export function updateClient(clientId: string, updates: UpdateClientInput): void {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can update clients');
    }

    const db = database.getConnection();
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND is_deleted = 0').get(clientId) as Client;
    if (!client) throw new Error('Client not found');

    const updateTx = db.transaction(() => {
        const now = new Date().toISOString();

        if (updates.name || updates.category_id !== undefined) {
            const newName = updates.name ? updates.name.trim() : client.name;
            const newCat = updates.category_id !== undefined ? updates.category_id : client.category_id;

            db.prepare(`
                UPDATE clients SET name = ?, category_id = ?, updated_at = ?
                WHERE id = ?
             `).run(newName, newCat, now, clientId);
        }

        if (updates.field_values) {
            // Check specific unique constraints for updates
            const typeFields = db.prepare('SELECT id, field_key FROM client_type_fields WHERE client_type_id = ?').all(client.client_type_id) as { id: string, field_key: string }[];
            const fieldMap = new Map(typeFields.map(f => [f.id, f.field_key]));
            const uniqueKeys = ['pan', 'pan_number', 'tan', 'aadhaar'];

            const checkDup = db.prepare(`
                SELECT c.id 
                FROM clients c
                JOIN client_field_values cfv ON c.id = cfv.client_id
                WHERE c.client_type_id = ? 
                AND c.is_deleted = 0
                AND cfv.field_id = ?
                AND cfv.value = ?
                AND c.id != ?  -- Exclude self
            `);

            const upsertVal = db.prepare(`
                INSERT INTO client_field_values (id, client_id, field_id, value)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET value = excluded.value
            `);

            // Delete old values? No, client_field_values PK is ID.
            // But we don't have the value ID in input.
            // We need to look up existing value ID for (client_id, field_id).
            const getValId = db.prepare('SELECT id FROM client_field_values WHERE client_id = ? AND field_id = ?');

            for (const fv of updates.field_values) {
                const key = fieldMap.get(fv.field_id);
                if (key && uniqueKeys.includes(key)) {
                    const dup = checkDup.get(client.client_type_id, fv.field_id, fv.value.trim(), clientId);
                    if (dup) throw new Error(`Duplicate value for ${key.toUpperCase()}: ${fv.value}`);
                }

                // Find existing value record
                const existing = getValId.get(clientId, fv.field_id) as { id: string };
                if (existing) {
                    db.prepare('UPDATE client_field_values SET value = ? WHERE id = ?').run(fv.value.trim(), existing.id);
                } else {
                    db.prepare('INSERT INTO client_field_values (id, client_id, field_id, value) VALUES (?, ?, ?, ?)').run(uuidv4(), clientId, fv.field_id, fv.value.trim());
                }
            }
        }
    });

    updateTx();
}

/**
 * Soft Delete Client.
 * ADMIN only.
 */
export function softDeleteClient(clientId: string): void {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can delete clients');
    }

    const db = database.getConnection();
    const res = db.prepare('UPDATE clients SET is_deleted = 1 WHERE id = ?').run(clientId);

    if (res.changes === 0) throw new Error('Client not found');
}
