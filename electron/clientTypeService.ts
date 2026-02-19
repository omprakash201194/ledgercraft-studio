import { database } from './database';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './auth';

// ─── Types ───────────────────────────────────────────────

export interface ClientType {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface ClientTypeField {
    id: string;
    client_type_id: string;
    label: string;
    field_key: string;
    data_type: string;
    is_required: number; // 0 or 1
    is_deleted: number; // 0 or 1
    created_at: string;
}

export interface AddFieldInput {
    label: string;
    field_key: string;
    data_type: string;
    is_required?: boolean;
}

// ─── Service Methods ─────────────────────────────────────

/**
 * Create a new Client Type.
 * Name must be unique.
 * ADMIN only.
 */
export function createClientType(name: string): ClientType {
    const user = getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
        throw new Error('Only administrators can create client types');
    }

    if (!name || name.trim().length === 0) {
        throw new Error('Client Type name is required');
    }

    const trimmedName = name.trim();
    const db = database.getConnection();

    // Check for duplicate name (Case-insensitive)
    const existing = db.prepare('SELECT id FROM client_types WHERE lower(name) = lower(?)').get(trimmedName);
    if (existing) {
        throw new Error(`Client Type with name "${trimmedName}" already exists`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO client_types (id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, trimmedName, now, now);

    return {
        id,
        name: trimmedName,
        created_at: now,
        updated_at: now
    };
}

/**
 * Get all Client Types (ordered by name).
 */
export function getAllClientTypes(): ClientType[] {
    const db = database.getConnection();
    return db.prepare('SELECT * FROM client_types ORDER BY name ASC').all() as ClientType[];
}

/**
 * Add a custom field to a Client Type.
 * field_key must be lowercase alphanumeric (plus underscores).
 */
export function addClientTypeField(clientTypeId: string, input: AddFieldInput): ClientTypeField {
    if (!clientTypeId) throw new Error('Client Type ID is required');
    if (!input.label || input.label.trim().length === 0) throw new Error('Field label is required');
    if (!input.field_key) throw new Error('Field key is required');
    if (!input.data_type) throw new Error('Data type is required');

    // Validate field_key format
    const keyRegex = /^[a-z0-9_]+$/;
    if (!keyRegex.test(input.field_key)) {
        throw new Error('Field key must contain only lowercase letters, numbers, and underscores');
    }

    const db = database.getConnection();

    // Verify Client Type exists
    const typeExists = db.prepare('SELECT id FROM client_types WHERE id = ?').get(clientTypeId);
    if (!typeExists) {
        throw new Error(`Client Type not found: ${clientTypeId}`);
    }

    // Check for duplicate field_key in this Client Type
    // We check against ALL fields, even deleted ones, to enforce strict uniqueness on the key
    // or typically we might allow re-using key if previous was deleted? 
    // Constraint is UNIQUE(client_type_id, field_key), so we MUST check all.
    const existing = db.prepare('SELECT id FROM client_type_fields WHERE client_type_id = ? AND field_key = ?').get(clientTypeId, input.field_key);

    if (existing) {
        throw new Error(`Field key "${input.field_key}" already exists for this Client Type`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const isRequired = input.is_required ? 1 : 0;

    const stmt = db.prepare(`
        INSERT INTO client_type_fields (id, client_type_id, label, field_key, data_type, is_required, is_deleted, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(id, clientTypeId, input.label.trim(), input.field_key, input.data_type, isRequired, now);

    return {
        id,
        client_type_id: clientTypeId,
        label: input.label.trim(),
        field_key: input.field_key,
        data_type: input.data_type,
        is_required: isRequired,
        is_deleted: 0,
        created_at: now
    };
}

/**
 * Get all active (non-deleted) fields for a Client Type.
 */
export function getClientTypeFields(clientTypeId: string): ClientTypeField[] {
    const db = database.getConnection();
    return db.prepare(`
        SELECT * FROM client_type_fields 
        WHERE client_type_id = ? AND is_deleted = 0 
        ORDER BY created_at ASC
    `).all(clientTypeId) as ClientTypeField[];
}

/**
 * Update a field's label.
 * field_key is immutable.
 */
export function updateClientTypeFieldLabel(fieldId: string, newLabel: string): void {
    if (!newLabel || newLabel.trim().length === 0) {
        throw new Error('New label is required');
    }

    const db = database.getConnection();
    const result = db.prepare('UPDATE client_type_fields SET label = ? WHERE id = ?').run(newLabel.trim(), fieldId);

    if (result.changes === 0) {
        throw new Error(`Field not found: ${fieldId}`);
    }
}

/**
 * Soft delete a field.
 */
export function softDeleteClientTypeField(fieldId: string): void {
    const db = database.getConnection();
    const result = db.prepare('UPDATE client_type_fields SET is_deleted = 1 WHERE id = ?').run(fieldId);

    if (result.changes === 0) {
        throw new Error(`Field not found: ${fieldId}`);
    }
}
