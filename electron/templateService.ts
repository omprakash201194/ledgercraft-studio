import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { app } from 'electron';
import { database } from './database';
import { getCurrentUser } from './auth';
import { logAction } from './auditService';
import { createForm, generateFieldsFromTemplate } from './formService';
import { mirrorCategoryHierarchy } from './categoryService';
import { extractPlaceholders } from './templateUtils';

// ─── Types ───────────────────────────────────────────────

export interface UploadResult {
    success: boolean;
    template?: {
        id: string;
        name: string;
        file_path: string;
        created_at: string;
        placeholders: string[];
    };
    error?: string;
}

// ─── Template Service ────────────────────────────────────

/**
 * Upload a .docx template file, save it to the templates directory,
 * extract placeholders, and store everything in the database.
 */
export function uploadTemplate(fileBuffer: Buffer, originalName: string, autoCreateForm: boolean = false, categoryId?: string | null): UploadResult {
    // Auth check: only ADMIN
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: 'Only administrators can upload templates' };
    }

    try {
        // 1. Generate unique filename and save to templates directory
        const fileId = uuidv4();
        const fileName = `${fileId}.docx`;
        const templatesDir = path.join(app.getPath('userData'), 'templates');
        const filePath = path.join(templatesDir, fileName);

        // Ensure templates directory exists
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }

        fs.writeFileSync(filePath, fileBuffer);


        // 2. Extract placeholders from the .docx content
        const placeholders = extractPlaceholders(fileBuffer);


        // 3. Store template record in database
        const template = database.createTemplate({
            name: originalName,
            file_path: filePath,
            category_id: categoryId,
        });

        // 4. Store placeholders in database (avoid duplicates)
        for (const key of placeholders) {
            database.createPlaceholder({
                template_id: template.id,
                placeholder_key: key,
            });
        }

        if (currentUser) {
            logAction({
                userId: currentUser.id,
                actionType: 'TEMPLATE_UPLOAD',
                entityType: 'TEMPLATE',
                entityId: template.id,
                metadata: { name: originalName }
            });
        }

        // 5. Auto-create form if requested
        if (autoCreateForm && placeholders.length > 0) {
            try {
                // 5a. Mirror Category Hierarchy
                let formCategoryId: string | null = null;
                if (categoryId) {
                    formCategoryId = mirrorCategoryHierarchy(categoryId);
                }

                // 5b. Resolve Name Conflict in Target Category
                const baseName = originalName.replace(/\.docx$/i, '');
                let finalName = baseName;

                const db = database.getConnection();
                // Check if name exists in the target FORM category
                const checkName = (nameToCheck: string) => {
                    const stmt = db.prepare(`
                        SELECT id FROM forms 
                        WHERE name = ? 
                        AND (category_id = ? OR (category_id IS NULL AND ? IS NULL)) 
                        AND is_deleted = 0
                    `);
                    return !!stmt.get(nameToCheck, formCategoryId, formCategoryId);
                };

                if (checkName(finalName)) {
                    finalName = `${baseName} (Auto)`;
                    if (checkName(finalName)) {
                        finalName = `${baseName} (Auto) ${new Date().getTime()}`;
                    }
                }

                // 5c. Create Form
                const fields = generateFieldsFromTemplate(template.id);
                // createForm handles its own logging
                createForm({
                    name: finalName,
                    template_id: template.id,
                    category_id: formCategoryId,
                    fields: fields
                });
            } catch (err) {
                console.error('[Template] Auto-create form failed:', err);
                // We intentionally do NOT throw here, so template upload remains successful
            }
        }

        return {
            success: true,
            template: {
                id: template.id,
                name: template.name,
                file_path: template.file_path,
                created_at: template.created_at,
                placeholders,
            },
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error during template upload';
        console.error(`[Template] Upload error: ${message}`);
        return { success: false, error: message };
    }
}

/**
 * Extract unique {{placeholder}} keys from a .docx file buffer.
 */




/**
 * Get all templates with their placeholder counts.
 */
export function getTemplates() {
    return database.getTemplatesWithPlaceholderCount();
}

/**
 * Get placeholders for a specific template.
 */
export function getTemplatePlaceholders(templateId: string) {
    return database.getPlaceholdersByTemplateId(templateId);
}
