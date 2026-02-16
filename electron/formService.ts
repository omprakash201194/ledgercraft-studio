import { database, FormField } from './database';
import { getCurrentUser } from './auth';
import { logAction } from './auditService';
import fs from 'fs';

// ─── Types ───────────────────────────────────────────────

export interface CreateFormInput {
    name: string;
    template_id: string;
    category_id?: string | null;
    fields: {
        label: string;
        field_key: string;
        data_type: string;
        required: boolean;
        placeholder_mapping: string | null;
        options_json: string | null;
    }[];
}

export interface CreateFormResult {
    success: boolean;
    form?: {
        id: string;
        name: string;
        template_id: string;
        created_at: string;
    };
    error?: string;
}

// ─── Form Service ────────────────────────────────────────

/**
 * Create a new form with fields, mapped to a template.
 */
export function createForm(input: CreateFormInput): CreateFormResult {
    // Auth check: only ADMIN
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: 'Only administrators can create forms' };
    }

    // Validation
    if (!input.name || input.name.trim().length === 0) {
        return { success: false, error: 'Form name is required' };
    }

    if (!input.fields || input.fields.length === 0) {
        return { success: false, error: 'At least one field is required' };
    }

    // Check for duplicate placeholder mappings
    const mappings = input.fields
        .map((f) => f.placeholder_mapping)
        .filter((m): m is string => m !== null && m !== '');
    const uniqueMappings = new Set(mappings);
    if (mappings.length !== uniqueMappings.size) {
        return { success: false, error: 'Placeholder mappings must be unique across fields' };
    }

    try {
        // Convert boolean required to integer for DB
        const dbFields: Omit<FormField, 'id' | 'form_id'>[] = input.fields.map((f) => ({
            label: f.label,
            field_key: f.field_key,
            data_type: f.data_type,
            required: f.required ? 1 : 0,
            placeholder_mapping: f.placeholder_mapping || null,
            options_json: f.options_json || null,
        }));

        const form = database.createForm(
            {
                name: input.name.trim(),
                template_id: input.template_id,
                category_id: input.category_id
            },
            dbFields
        );

        console.log(`[Form] Created form "${form.name}" with ${input.fields.length} field(s)`);

        if (currentUser) {
            logAction({
                userId: currentUser.id,
                actionType: 'FORM_CREATE',
                entityType: 'FORM',
                entityId: form.id,
                metadata: { name: form.name, templateId: input.template_id }
            });
        }

        return { success: true, form };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error creating form';
        console.error(`[Form] Error: ${message}`);
        return { success: false, error: message };
    }
}

export function deleteForm(formId: string, deleteReports: boolean = false): { success: boolean; error?: string } {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, error: 'You must be logged in to delete forms' };
    }

    // Only Admins or perhaps Creators should delete forms. 
    // For now, let's restrict to ADMIN for hard delete, or maybe anyone can soft delete their own?
    // Let's stick to simple role check: Admin can do anything.
    if (currentUser.role !== 'ADMIN') {
        return { success: false, error: 'Only administrators can delete forms' };
    }

    try {
        const form = database.getFormById(formId);
        if (!form) {
            return { success: false, error: 'Form not found' };
        }

        if (deleteReports) {
            // HARD DELETE: Valid only if we also delete reports
            // 1. Get all reports for this form
            // We need a way to get reports by form. database.ts doesn't have it exposed efficiently yet?
            // Actually, we can just delete from DB with cascade if we had it, but we need to delete FILES too.
            // So we must iterate.

            // New helper needed in database to get reports by form? 
            // Or we just iterate all reports (inefficient).
            // Let's add getReportsByForm to database.ts first? 
            // OR, simpler: just use a direct query here if we could, but we can't access DB instance directly easily.
            // Wait, we can use database object.

            const reports = database.getConnection().prepare('SELECT * FROM reports WHERE form_id = ?').all(formId) as any[];

            for (const report of reports) {
                if (fs.existsSync(report.file_path)) {
                    try {
                        fs.unlinkSync(report.file_path);
                    } catch (e) {
                        console.error(`[FormService] Failed to delete report file ${report.file_path}`, e);
                    }
                }
            }

            // Now we can hard delete form (and reports will be CASCADE deleted in DB or we delete them manually)
            // Schema says: FOREIGN KEY (form_id) REFERENCES forms(id)
            // But we didn't specify ON DELETE CASCADE in schema!
            // So we must delete reports from DB first.
            database.getConnection().prepare('DELETE FROM reports WHERE form_id = ?').run(formId);

            // Now hard delete form
            database.deleteForm(formId, false); // false = hard delete
            logAction({
                userId: currentUser.id,
                actionType: 'FORM_DELETE_HARD',
                entityType: 'FORM',
                entityId: formId,
            });

        } else {
            // SOFT DELETE (Archive)
            database.deleteForm(formId, true); // true = soft delete
            logAction({
                userId: currentUser.id,
                actionType: 'FORM_DELETE_SOFT',
                entityType: 'FORM',
                entityId: formId,
            });
        }

        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error deleting form';
        console.error(`[FormService] Delete error: ${message}`);
        return { success: false, error: message };
    }
}

/**
 * Get all forms with template name and field count.
 */
export function getForms() {
    return database.getFormsWithDetails();
}

/**
 * Get a single form by ID with template name.
 */
export function getFormById(formId: string) {
    return database.getFormById(formId) || null;
}

/**
 * Get all fields for a form.
 */
export function getFormFields(formId: string) {
    return database.getFormFields(formId);
}

/**
 * Generate fields from template placeholders using heuristic rules.
 * Does NOT persist to DB. Returns transient field objects.
 */
export function generateFieldsFromTemplate(templateId: string) {
    const placeholders = database.getPlaceholdersByTemplateId(templateId);

    return placeholders.map(p => {
        const key = p.placeholder_key;
        return {
            label: formatLabel(key),
            field_key: key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            data_type: detectType(key),
            required: true,
            placeholder_mapping: key,
            options_json: null
        };
    });
}

// ─── Heuristics ──────────────────────────────────────────

function formatLabel(key: string): string {
    return key.split(/[_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function detectType(key: string): string {
    const k = key.toLowerCase();
    if (k.includes('date')) return 'date';
    if (k.includes('amount') || k.includes('total') || k.includes('price') || k.includes('cost')) return 'currency';
    if (k.includes('year') || k.includes('count') || k.includes('percentage') || k.includes('rate')) return 'number';
    return 'text';
}

export interface UpdateFormInput {
    id: string;
    name?: string;
    category_id?: string | null;
    template_id?: string;
    fields?: {
        label: string;
        field_key: string;
        data_type: string;
        required: boolean;
        placeholder_mapping: string | null;
        options_json: string | null;
    }[];
}

export function updateForm(input: UpdateFormInput) {
    // Auth check
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: 'Only administrators can update forms' };
    }

    try {
        let dbFields = undefined;
        if (input.fields) {
            // Validate unique mappings if fields are being updated
            const mappings = input.fields
                .map((f) => f.placeholder_mapping)
                .filter((m): m is string => m !== null && m !== '');
            const uniqueMappings = new Set(mappings);
            if (mappings.length !== uniqueMappings.size) {
                return { success: false, error: 'Placeholder mappings must be unique across fields' };
            }

            dbFields = input.fields.map((f) => ({
                label: f.label,
                field_key: f.field_key,
                data_type: f.data_type,
                required: f.required ? 1 : 0,
                placeholder_mapping: f.placeholder_mapping || null,
                options_json: f.options_json || null,
            }));
        }

        const form = database.updateForm(
            input.id,
            { name: input.name, category_id: input.category_id, template_id: input.template_id },
            dbFields
        );

        return { success: true, form };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error updating form';
        return { success: false, error: message };
    }
}
