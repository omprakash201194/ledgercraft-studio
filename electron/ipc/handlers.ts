import { ipcMain, app, dialog, shell } from 'electron';
import fs from 'fs';
import { login, logout, tryAutoLogin, getCurrentUser, createUser } from '../auth';
import { database } from '../database';
import { SafeUser } from '../auth';
import { uploadTemplate, getTemplates, getTemplatePlaceholders } from '../templateService';
import { extractPlaceholders } from '../templateUtils';
import { createForm, getForms, getFormById, getFormFields, updateForm, generateFieldsFromTemplate, deleteForm, CreateFormInput, UpdateFormInput } from '../formService';
import { generateReport, getReports, deleteReport, deleteReports, GenerateReportInput } from '../reportService';
import { getAuditLogs, getAnalytics } from '../auditService';
import { getUserPreferences, updateUserPreferences } from '../preferenceService';
import {
    getCategoryTree,
    getCategoryChain,
    createCategory,
    renameCategory,
    deleteCategory,
    moveItem,
    deleteTemplate,
    CreateCategoryInput,
    MoveItemInput
} from '../categoryService';
import { exportBackup, restoreBackup } from '../backupService';

/**
 * Register all IPC handlers.
 * Called once during app initialization.
 */
export function registerIpcHandlers(): void {
    // ... existing handlers ...

    // ─── Categories & Lifecycle ──────────────────────────
    ipcMain.handle('category:get-tree', (_event, type: 'TEMPLATE' | 'FORM') => {
        return getCategoryTree(type);
    });

    ipcMain.handle('category:get-chain', (_event, id: string) => {
        return getCategoryChain(id);
    });

    ipcMain.handle('category:create', (_event, input: CreateCategoryInput) => {
        return createCategory(input);
    });

    ipcMain.handle('category:rename', (_event, id: string, newName: string) => {
        return renameCategory(id, newName);
    });

    ipcMain.handle('category:delete', (_event, id: string, type: 'TEMPLATE' | 'FORM') => {
        return deleteCategory(id, type);
    });

    ipcMain.handle('item:move', (_event, input: MoveItemInput) => {
        return moveItem(input);
    });

    ipcMain.handle('template:delete', (_event, id: string, force: boolean = false) => {
        return deleteTemplate(id, force);
    });

    ipcMain.handle('form:delete', (_event, formId: string, deleteReports: boolean = false) => {
        return deleteForm(formId, deleteReports);
    });

    ipcMain.handle('form:get-report-count', (_event, formId: string) => {
        return database.getReportCountByForm(formId);
    });

    // ─── Reports ─────────────────────────────────────────

    // ─── App ─────────────────────────────────────────────
    ipcMain.handle('get-app-data-path', () => {
        return app.getPath('userData');
    });

    ipcMain.handle('app:get-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('app:get-db-status', () => {
        return database.getDbStatus();
    });

    ipcMain.handle('backup:export', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Export Backup',
            defaultPath: `ledgercraft-backup-${new Date().toISOString().split('T')[0]}.zip`,
            filters: [{ name: 'Zip Files', extensions: ['zip'] }]
        });
        if (canceled || !filePath) return { success: false, cancelled: true };
        return exportBackup(filePath);
    });

    ipcMain.handle('backup:restore', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Select Backup File',
            filters: [{ name: 'Zip Files', extensions: ['zip'] }],
            properties: ['openFile']
        });
        if (canceled || filePaths.length === 0) return { success: false, cancelled: true };

        const choice = dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Confirm Restore',
            message: 'Restoring a backup will replace all current data and restart the application. Are you sure?',
            buttons: ['Cancel', 'Restore'],
            defaultId: 0,
            cancelId: 0
        });

        if (choice === 0) return { success: false, cancelled: true };

        return restoreBackup(filePaths[0]);
    });

    // ─── Auth ────────────────────────────────────────────
    ipcMain.handle('auth:login', (_event, username: string, password: string) => {
        return login(username, password);
    });

    ipcMain.handle('auth:try-auto-login', async () => {
        return tryAutoLogin();
    });

    ipcMain.handle('auth:logout', () => {
        logout();
        return { success: true };
    });

    ipcMain.handle('auth:get-current-user', () => {
        return getCurrentUser();
    });

    ipcMain.handle('auth:create-user', (_event, username: string, password: string, role: string) => {
        return createUser(username, password, role);
    });

    ipcMain.handle('auth:get-all-users', () => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return { success: false, error: 'Unauthorized', users: [] };
        }
        const users = database.getAllUsers();
        const safeUsers: SafeUser[] = users.map((u) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            created_at: u.created_at,
        }));
        return { success: true, users: safeUsers };
    });

    ipcMain.handle('auth:reset-password', (_event, targetUserId: string, newPassword: string) => {
        // dynamic import or move import to top if circular dependency issues arise, 
        // but here we imported it effectively at the top of the file
        const { resetUserPassword } = require('../auth');
        return resetUserPassword(targetUserId, newPassword);
    });

    // ─── Templates ───────────────────────────────────────
    // Updated: Split into Pick/Analyze and Process
    ipcMain.handle('template:pick-analyze', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Select Template',
            filters: [{ name: 'Word Documents', extensions: ['docx'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) {
            return { canceled: true };
        }

        try {
            const filePath = filePaths[0];
            const fileBuffer = fs.readFileSync(filePath);
            const originalName = filePath.split(/[\\/]/).pop() || 'template.docx';
            const placeholders = extractPlaceholders(fileBuffer);

            return {
                canceled: false,
                filePath,
                originalName,
                placeholders,
                placeholderCount: placeholders.length
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return { canceled: false, error: `Analysis failed: ${message}` };
        }
    });

    ipcMain.handle('template:process-upload', async (_event, filePath: string, ...args: any[]) => {
        try {
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'File no longer exists' };
            }
            const fileBuffer = fs.readFileSync(filePath);
            const originalName = filePath.split(/[\\/]/).pop() || 'template.docx';

            let autoCreateForm = false;
            let categoryId: string | null = null;

            // Handle arguments: either (boolean, categoryId?) OR ({ autoCreateForm, categoryId })
            if (args.length > 0) {
                if (typeof args[0] === 'object' && args[0] !== null) {
                    const options = args[0];
                    autoCreateForm = !!options.autoCreateForm;
                    categoryId = options.categoryId || null;
                } else if (typeof args[0] === 'boolean') {
                    autoCreateForm = args[0];
                    categoryId = args[1] || null;
                }
            }

            return uploadTemplate(fileBuffer, originalName, autoCreateForm, categoryId);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: `Upload failed: ${message}` };
        }
    });

    ipcMain.handle('template:get-all', (_event, page: number = 1, limit: number = 10, categoryId?: string | null) => {
        return database.getTemplates(page, limit, categoryId);
    });

    ipcMain.handle('template:get-placeholders', (_event, templateId: string) => {
        return getTemplatePlaceholders(templateId);
    });

    // ─── Forms ───────────────────────────────────────────
    ipcMain.handle('form:create', (_event, input: CreateFormInput) => {
        return createForm(input);
    });

    ipcMain.handle('form:update', (_event, input: UpdateFormInput) => {
        return updateForm(input);
    });

    ipcMain.handle('form:get-all', (_event, page: number = 1, limit: number = 10, categoryId?: string | null, includeArchived: boolean = false) => {
        return database.getFormsWithDetails(page, limit, categoryId, includeArchived);
    });

    ipcMain.handle('form:get-by-id', (_event, formId: string) => {
        return getFormById(formId);
    });

    ipcMain.handle('form:get-fields', (_event, formId: string) => {
        return getFormFields(formId);
    });

    ipcMain.handle('form:generate-fields', (_event, templateId: string) => {
        return generateFieldsFromTemplate(templateId);
    });

    ipcMain.handle('form:get-hierarchy', () => {
        return database.getFormsWithHierarchy();
    });

    ipcMain.handle('form:get-recent', (_event, limit: number = 5) => {
        return database.getRecentForms(limit);
    });

    // ─── Reports ─────────────────────────────────────────
    ipcMain.handle('report:generate', (_event, input: GenerateReportInput) => {
        return generateReport(input);
    });

    ipcMain.handle('report:get-all', (_event, page: number = 1, limit: number = 10, formId?: string, search?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC') => {

        const safeSortBy = sortBy || 'generated_at';
        const safeSortOrder = sortOrder || 'DESC';
        return getReports(page, limit, formId, search, safeSortBy, safeSortOrder);
    });

    ipcMain.handle('report:get-by-id', (_event, reportId: string) => {
        return database.getReportById(reportId);
    });

    ipcMain.handle('report:delete', (_event, reportId: string) => {
        return deleteReport(reportId);
    });

    ipcMain.handle('report:delete-bulk', (_event, reportIds: string[]) => {
        return deleteReports(reportIds); // You need to import this function too
    });

    ipcMain.handle('report:download', async (_event, filePath: string) => {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'Source file not found' };
        }

        const fileName = filePath.split(/[\\/]/).pop() || 'report.docx';
        const { canceled, filePath: destinationPath } = await dialog.showSaveDialog({
            title: 'Download Report',
            defaultPath: fileName,
            filters: [{ name: 'Word Documents', extensions: ['docx'] }],
        });

        if (canceled || !destinationPath) {
            return { success: false, error: 'Download canceled' };
        }

        try {
            fs.copyFileSync(filePath, destinationPath);
            return { success: true, filePath: destinationPath };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: `Failed to save file: ${message}` };
        }
    });

    // ─── Shell ───────────────────────────────────────────
    ipcMain.handle('shell:open-file', (_event, filePath: string) => {
        return shell.openPath(filePath);
    });
    // ─── Audit & Analytics ───────────────────────────────
    ipcMain.handle('audit:get-logs', (_event, params: { page: number, pageSize: number, filters: any }) => {
        const { page, pageSize, filters } = params || {};
        return getAuditLogs(page, pageSize, filters);
    });

    ipcMain.handle('audit:get-analytics', () => {
        return getAnalytics();
    });

    // ─── Preferences ─────────────────────────────────────
    ipcMain.handle('prefs:get', (_event, userId: string) => {
        return getUserPreferences(userId);
    });

    ipcMain.handle('prefs:update', (_event, userId: string, prefs: any) => {
        return updateUserPreferences(userId, prefs);
    });
}

