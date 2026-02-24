import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { database } from '../database';
import { getCurrentUser } from '../auth';
import { logAction } from '../auditService';
import { generateReport } from '../reportService';
import { getClientById } from '../clientService';
import { buildBulkFileName, ensureUniqueFilePath } from '../utils/fileNameBuilder';
import { BulkReportRequest, BulkReportResult, BulkReportItemResult, BulkProgressPayload } from '../types/bulk';

type ProgressCallback = (payload: BulkProgressPayload) => void;

interface JobItem {
    clientId: string;
    formId: string;
}

export async function generateBulkReports(
    request: BulkReportRequest,
    onProgress?: ProgressCallback
): Promise<BulkReportResult> {
    if (!request || typeof request !== 'object') {
        return { success: false, total: 0, successful: 0, failed: 0, reports: [], error: 'Invalid request' };
    }

    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return {
            success: false,
            total: 0, successful: 0, failed: 0, reports: [],
            error: 'You must be an administrator to generate bulk reports'
        };
    }

    if (!request.clientIds || request.clientIds.length === 0) {
        return { success: false, total: 0, successful: 0, failed: 0, reports: [], error: 'No clients selected' };
    }
    if (!request.formIds || request.formIds.length === 0) {
        return { success: false, total: 0, successful: 0, failed: 0, reports: [], error: 'No forms selected' };
    }

    // Build the matrix
    const jobs: JobItem[] = [];
    for (const clientId of request.clientIds) {
        for (const formId of request.formIds) {
            jobs.push({ clientId, formId });
        }
    }

    const total = jobs.length;
    let completed = 0;
    let successful = 0;
    let failed = 0;
    const reports: BulkReportItemResult[] = [];

    // Map to cache entities to avoid duplicate DB calls if possible, but DB calls are fast anyway
    const getClientName = (id: string) => {
        try {
            const client = getClientById(id);
            return client ? client.name : 'Unknown Client';
        } catch { return 'Unknown Client'; }
    };

    const getFormName = (id: string) => {
        try {
            const form = database.getFormById(id);
            return form ? form.name : 'Unknown Form';
        } catch { return 'Unknown Form'; }
    };

    // Concurrency limit processor (Limit = 5)
    const limit = 5;
    const executing = new Set<Promise<void>>();

    for (const job of jobs) {
        const workerP = (async () => {
            const clientName = getClientName(job.clientId);
            const formName = getFormName(job.formId);

            try {
                // Yield to the event loop without adding artificial delay
                await new Promise<void>(resolve => setImmediate(resolve));

                const result = generateReport({
                    form_id: job.formId,
                    client_id: job.clientId,
                    values: {} // empty manual values, rely entirely on prefill
                });

                if (result.success && result.report) {
                    // Rename and move the file to follow the new filename rules
                    const oldFilePath = result.report.file_path;

                    const newFileName = buildBulkFileName(clientName, formName, request.financialYear);
                    // Use the same form-name sanitization as reportService to keep directories consistent
                    const sanitizedFormFolder = formName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'report';
                    const targetDir = path.join(app.getPath('userData'), 'reports', sanitizedFormFolder);

                    const finalFilePath = ensureUniqueFilePath(targetDir, newFileName);

                    // Rename file; fall back to original path if the file is unexpectedly missing
                    let reportedFilePath = oldFilePath;
                    if (fs.existsSync(oldFilePath)) {
                        fs.renameSync(oldFilePath, finalFilePath);

                        // Update DB with new filepath
                        const db = database.getConnection();
                        db.prepare('UPDATE reports SET file_path = ? WHERE id = ?').run(finalFilePath, result.report.id);
                        reportedFilePath = finalFilePath;
                    }

                    successful++;
                    reports.push({
                        clientId: job.clientId, clientName,
                        formId: job.formId, formName,
                        success: true,
                        filePath: reportedFilePath
                    });
                } else {
                    failed++;
                    reports.push({
                        clientId: job.clientId, clientName,
                        formId: job.formId, formName,
                        success: false,
                        error: result.error || 'Unknown error during generation'
                    });
                }
            } catch (err: any) {
                failed++;
                reports.push({
                    clientId: job.clientId, clientName,
                    formId: job.formId, formName,
                    success: false,
                    error: err.message || 'Exception during generation'
                });
            } finally {
                completed++;
                if (onProgress) {
                    onProgress({
                        total, completed, successful, failed,
                        currentItem: { clientName, formName },
                        isComplete: false
                    });
                }
            }
        })();

        executing.add(workerP);
        const cleanup = () => executing.delete(workerP);
        workerP.then(cleanup).catch(cleanup);

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);

    // Final audit and return
    logAction({
        userId: currentUser.id,
        actionType: 'BULK_REPORT_GENERATE',
        entityType: 'REPORT',
        metadata: {
            total, successful, failed,
            financialYear: request.financialYear
        }
    });

    const finalResult = {
        success: failed === 0,
        total, successful, failed, reports
    };

    if (onProgress) {
        onProgress({
            total, completed, successful, failed,
            currentItem: { clientName: '', formName: '' },
            isComplete: true
        });
    }

    // Open reports directory if any were successful
    if (successful > 0) {
        const reportsBaseDir = path.join(app.getPath('userData'), 'reports');
        if (fs.existsSync(reportsBaseDir)) {
            shell.openPath(reportsBaseDir);
        }
    }

    return finalResult;
}
