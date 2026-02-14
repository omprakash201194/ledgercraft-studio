import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { app } from 'electron';
import { database } from './database';
import { getCurrentUser } from './auth';

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
export function uploadTemplate(fileBuffer: Buffer, originalName: string): UploadResult {
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
        console.log(`[Template] File saved: ${filePath}`);

        // 2. Extract placeholders from the .docx content
        const placeholders = extractPlaceholders(fileBuffer);
        console.log(`[Template] Extracted ${placeholders.length} placeholders from "${originalName}"`);

        // 3. Store template record in database
        const template = database.createTemplate({
            name: originalName,
            file_path: filePath,
        });

        // 4. Store placeholders in database (avoid duplicates)
        for (const key of placeholders) {
            database.createPlaceholder({
                template_id: template.id,
                placeholder_key: key,
            });
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
function extractPlaceholders(fileBuffer: Buffer): string[] {
    const zip = new PizZip(fileBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
    });

    // Get full text from the document
    const text = doc.getFullText();

    // Extract all {{...}} placeholders using regex
    const regex = /\{\{(.*?)\}\}/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        const key = match[1].trim();
        if (key && !matches.includes(key)) {
            matches.push(key);
        }
    }

    return matches;
}

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
