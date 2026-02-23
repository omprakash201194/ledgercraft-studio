import { database } from './database';
import { getCurrentUser } from './auth';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

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

    // Get all fields for this client type to map ID -> Key and metadata
    const typeFields = db.prepare('SELECT id, field_key, data_type, is_required FROM client_type_fields WHERE client_type_id = ? AND is_deleted = 0').all(input.client_type_id) as { id: string, field_key: string, data_type: string, is_required: number }[];
    const fieldMap = new Map(typeFields.map(f => [f.id, f.field_key]));
    const fieldMetaMap = new Map(typeFields.map(f => [f.id, f]));

    // Validate required fields
    for (const field of typeFields) {
        if (field.is_required === 1) {
            const provided = input.field_values.find(fv => fv.field_id === field.id);
            if (!provided || !provided.value || provided.value.trim().length === 0) {
                throw new Error(`Required field "${field.field_key}" is missing`);
            }
        }
    }

    // Validate data types
    for (const fv of input.field_values) {
        const meta = fieldMetaMap.get(fv.field_id);
        if (!meta || !fv.value || fv.value.trim().length === 0) continue;

        if (meta.data_type === 'number') {
            if (isNaN(Number(fv.value.trim()))) {
                throw new Error(`Field "${meta.field_key}" expects a numeric value`);
            }
        } else if (meta.data_type === 'date') {
            const d = new Date(fv.value.trim());
            if (isNaN(d.getTime())) {
                throw new Error(`Field "${meta.field_key}" expects a valid date`);
            }
        }
    }

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
        SELECT c.*, 
               (
                   SELECT json_group_object(ctf.field_key, cfv_inner.value)
                   FROM client_field_values cfv_inner
                   JOIN client_type_fields ctf ON ctf.id = cfv_inner.field_id
                   WHERE cfv_inner.client_id = c.id
               ) as fields_json
        FROM clients c
        LEFT JOIN client_field_values cfv ON c.id = cfv.client_id
        WHERE c.is_deleted = 0
        AND (
            c.name LIKE ? 
            OR cfv.value LIKE ?
        )
        GROUP BY c.id
        ORDER BY c.name ASC
        LIMIT 50
    `;

    const pattern = `%${trimmedQuery}%`;
    const results = db.prepare(sql).all(pattern, pattern) as (Client & { fields_json?: string })[];

    return results.map(row => {
        const client: Client = {
            id: row.id,
            name: row.name,
            client_type_id: row.client_type_id,
            category_id: row.category_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            is_deleted: row.is_deleted
        };

        if (row.fields_json) {
            try {
                const parsed = JSON.parse(row.fields_json);
                // JSON_GROUP_OBJECT returns {} for empty groups sometimes, handle it
                if (Object.keys(parsed).length > 0) {
                    client.field_values = parsed;
                }
            } catch (e) {
                console.error('Failed to parse fields_json', e);
            }
        }
        return client;
    });
}

/**
 * Get top clients sorted by report count.
 */
export function getTopClients(limit: number = 10): Client[] {
    const db = database.getConnection();
    const sql = `
        SELECT c.*
        FROM clients c
        LEFT JOIN reports r ON r.client_id = c.id
        WHERE c.is_deleted = 0
        GROUP BY c.id
        ORDER BY COUNT(r.id) DESC
        LIMIT ?
    `;
    return db.prepare(sql).all(limit) as Client[];
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

// ─── Safe Client Deletion & Export ────────────────────────

/**
 * Get count of reports associated with a client.
 */
export function getReportCountByClient(clientId: string): number {
    const db = database.getConnection();
    const result = db.prepare('SELECT COUNT(*) as count FROM reports WHERE client_id = ?').get(clientId) as { count: number };
    return result.count;
}

/**
 * Get all reports for a client.
 */
export function getReportsByClient(clientId: string): { id: string; file_path: string; created_at: string }[] {
    const db = database.getConnection();
    return db.prepare('SELECT id, file_path, created_at FROM reports WHERE client_id = ?').all(clientId) as { id: string; file_path: string; created_at: string }[];
}

/**
 * Delete client but KEEP reports (detach them).
 * ADMIN only.
 */
export function deleteClientOnly(clientId: string, role: string): void {
    if (role !== 'ADMIN') {
        throw new Error('Only administrators can delete clients');
    }

    const db = database.getConnection();

    const transaction = db.transaction(() => {
        // 1. Soft delete client
        const clientRes = db.prepare('UPDATE clients SET is_deleted = 1 WHERE id = ?').run(clientId);
        if (clientRes.changes === 0) throw new Error('Client not found');

        // 2. Detach reports
        db.prepare('UPDATE reports SET client_id = NULL WHERE client_id = ?').run(clientId);
    });

    transaction();
}

/**
 * Delete client AND all their reports (files + DB rows).
 * ADMIN only.
 */
export function deleteClientWithReports(clientId: string, role: string): void {
    if (role !== 'ADMIN') {
        throw new Error('Only administrators can delete clients');
    }

    const db = database.getConnection();

    // Get all reports first to know which files to delete
    const reports = db.prepare('SELECT id, file_path FROM reports WHERE client_id = ?').all(clientId) as { id: string; file_path: string }[];

    const transaction = db.transaction(() => {
        // 1. Delete reports from DB
        db.prepare('DELETE FROM reports WHERE client_id = ?').run(clientId);

        // 2. Soft delete client
        const clientRes = db.prepare('UPDATE clients SET is_deleted = 1 WHERE id = ?').run(clientId);
        if (clientRes.changes === 0) throw new Error('Client not found');
    });

    transaction();

    // 3. Delete files from disk
    for (const report of reports) {
        if (report.file_path && fs.existsSync(report.file_path)) {
            try {
                fs.unlinkSync(report.file_path);
            } catch (err) {
                console.error(`Failed to delete report file: ${report.file_path}`, err);
            }
        }
    }
}

/**
 * Export all client reports as a ZIP file.
 * ADMIN only.
 * Returns path to zip file.
 */
export function exportClientReportsZip(clientId: string, role: string): string {
    if (role !== 'ADMIN') {
        throw new Error('Only administrators can export client data');
    }

    const db = database.getConnection();
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(clientId) as { name: string };
    if (!client) throw new Error('Client not found');

    const reports = db.prepare('SELECT file_path FROM reports WHERE client_id = ?').all(clientId) as { file_path: string }[];

    if (reports.length === 0) {
        throw new Error('No reports found for this client');
    }

    const zip = new AdmZip();
    let addedCount = 0;

    for (const report of reports) {
        if (report.file_path && fs.existsSync(report.file_path)) {
            zip.addLocalFile(report.file_path);
            addedCount++;
        }
    }

    if (addedCount === 0) {
        throw new Error('No valid report files found on disk');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = client.name.replace(/[^a-z0-9]/gi, '_');
    const zipName = `${safeName}_Reports_${timestamp}.zip`;
    const zipPath = path.join(os.tmpdir(), zipName);

    zip.writeZip(zipPath);
    return zipPath;
}
