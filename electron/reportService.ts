import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { app } from 'electron';
import { database } from './database';
import { getCurrentUser } from './auth';

// ─── Types ───────────────────────────────────────────────

export interface GenerateReportInput {
    form_id: string;
    values: Record<string, string | number | boolean>;
}

export interface GenerateReportResult {
    success: boolean;
    report?: {
        id: string;
        file_path: string;
        generated_at: string;
    };
    error?: string;
}

// ─── Report Service ──────────────────────────────────────

/**
 * Generate a Word document report by filling a template with form values.
 */
export function generateReport(input: GenerateReportInput): GenerateReportResult {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, error: 'You must be logged in to generate reports' };
    }

    try {
        // 1. Get form and its template
        const form = database.getFormById(input.form_id);
        if (!form) {
            return { success: false, error: 'Form not found' };
        }

        // 2. Get form fields to map values to placeholders
        const fields = database.getFormFields(input.form_id);

        // 3. Build placeholder→value map
        const placeholderValues: Record<string, string> = {};
        for (const field of fields) {
            if (field.placeholder_mapping) {
                const value = input.values[field.field_key];
                placeholderValues[field.placeholder_mapping] = value != null ? String(value) : '';
            }
        }

        // 4. Load the template .docx file
        // Get template file path from DB
        const templates = database.getTemplates();
        const template = templates.find((t) => t.id === form.template_id);
        if (!template) {
            return { success: false, error: 'Template file not found' };
        }

        if (!fs.existsSync(template.file_path)) {
            return { success: false, error: `Template file missing: ${template.file_path}` };
        }

        const templateBuffer = fs.readFileSync(template.file_path);

        // 5. Fill placeholders using docxtemplater
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
        });

        doc.render(placeholderValues);

        const outputBuffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // 6. Save to reports directory
        const sanitizedFormName = form.name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'report';
        const reportsDir = path.join(app.getPath('userData'), 'reports', sanitizedFormName);

        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${timestamp}.docx`;
        const filePath = path.join(reportsDir, fileName);

        fs.writeFileSync(filePath, outputBuffer);
        console.log(`[Report] Generated: ${filePath}`);

        // 7. Store in database
        const report = database.createReport({
            form_id: input.form_id,
            generated_by: currentUser.id,
            file_path: filePath,
        });

        return {
            success: true,
            report: {
                id: report.id,
                file_path: report.file_path,
                generated_at: report.generated_at,
            },
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error generating report';
        console.error(`[Report] Error: ${message}`);
        return { success: false, error: message };
    }
}

/**
 * Get reports — ADMIN sees all, USER sees own.
 */
export function getReports() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    if (currentUser.role === 'ADMIN') {
        return database.getReportsWithDetails();
    }

    return database.getReportsByUser(currentUser.id);
}
