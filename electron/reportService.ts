import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { app } from 'electron';
import { database } from './database';
import { getCurrentUser } from './auth';
import { logAction } from './auditService';

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
        // 4. Load the template .docx file
        // Get template file path from DB
        const template = database.getTemplateById(form.template_id);
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

        const fileName = `${sanitizedFormName}_${timestamp}.docx`;
        const filePath = path.join(reportsDir, fileName);

        fs.writeFileSync(filePath, outputBuffer);


        // 7. Store record in database
        const report = database.createReport({
            form_id: form.id,
            generated_by: currentUser.id,
            file_path: filePath,
            input_values: JSON.stringify(input.values),
        });

        if (currentUser) {
            logAction({
                userId: currentUser.id,
                actionType: 'REPORT_GENERATE',
                entityType: 'REPORT',
                entityId: report.id,
                metadata: { formName: form.name }
            });
        }

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

export function deleteReport(reportId: string): { success: boolean; error?: string } {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, error: 'You must be logged in to delete reports' };
    }

    try {
        const report = database.getReportById(reportId);
        if (!report) {
            return { success: false, error: 'Report not found' };
        }

        // Auth check: Admin or Creator
        if (currentUser.role !== 'ADMIN' && currentUser.id !== report.generated_by) {
            return { success: false, error: 'You do not have permission to delete this report' };
        }

        // Delete file from disk
        if (fs.existsSync(report.file_path)) {
            try {
                fs.unlinkSync(report.file_path);
            } catch (err) {
                console.error(`[Report] Failed to delete file ${report.file_path}:`, err);
                // Continue to delete from DB even if file delete fails (or maybe not?)
                // Let's log it but proceed to clean up DB
            }
        }

        // Delete from DB
        database.deleteReport(reportId);

        logAction({
            userId: currentUser.id,
            actionType: 'REPORT_DELETE',
            entityType: 'REPORT',
            entityId: reportId,
        });

        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error deleting report';
        console.error(`[Report] Delete error: ${message}`);
        return { success: false, error: message };
    }
}

export function deleteReports(reportIds: string[]): { success: boolean; error?: string; deletedCount?: number } {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, error: 'You must be logged in to delete reports' };
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of reportIds) {
        const result = deleteReport(id);
        if (result.success) {
            deletedCount++;
        } else {
            console.error(`Failed to delete report ${id}: ${result.error}`);
            errors.push(`Failed to delete report ${id}: ${result.error}`);
        }
    }

    if (deletedCount === 0 && reportIds.length > 0) {
        return { success: false, error: 'Failed to delete selected reports' };
    }

    return { success: true, deletedCount };
}



/**
 * Get reports — ADMIN sees all, USER sees own.
 */
export function getReports(page: number = 1, limit: number = 10, formId?: string, search?: string, sortBy: string = 'generated_at', sortOrder: 'ASC' | 'DESC' = 'DESC') {
    const currentUser = getCurrentUser();
    if (!currentUser) return { reports: [], total: 0 };

    if (currentUser.role === 'ADMIN') {
        return database.getReportsWithDetails(page, limit, formId, search, sortBy, sortOrder);
    }

    // User - fetch all sorted then slice
    const allReports = database.getReportsByUser(currentUser.id, sortBy, sortOrder);
    // basic in-memory pagination for user
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
        reports: allReports.slice(start, end),
        total: allReports.length
    };
}

