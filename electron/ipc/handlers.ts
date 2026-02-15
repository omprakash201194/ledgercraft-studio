import { ipcMain, app, dialog, shell } from 'electron';
import fs from 'fs';
import { login, logout, getCurrentUser, createUser } from '../auth';
import { database } from '../database';
import { SafeUser } from '../auth';
import { uploadTemplate, getTemplates, getTemplatePlaceholders } from '../templateService';
import { createForm, getForms, getFormById, getFormFields, updateForm, CreateFormInput, UpdateFormInput } from '../formService';
import { generateReport, getReports, GenerateReportInput } from '../reportService';
import {
    getCategoryTree,
    createCategory,
    renameCategory,
    deleteCategory,
    moveItem,
    deleteTemplate,
    deleteForm,
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

    ipcMain.handle('template:delete', (_event, id: string) => {
        return deleteTemplate(id);
    });

    ipcMain.handle('form:delete', (_event, id: string) => {
        return deleteForm(id);
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

    // ─── Templates ───────────────────────────────────────
    ipcMain.handle('template:upload', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select a .docx Template',
            filters: [{ name: 'Word Documents', extensions: ['docx'] }],
            properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'No file selected' };
        }

        const filePath = result.filePaths[0];
        const originalName = filePath.split(/[\\/]/).pop() || 'template.docx';
        const fileBuffer = fs.readFileSync(filePath);

        return uploadTemplate(Buffer.from(fileBuffer), originalName);
    });

    ipcMain.handle('template:get-all', () => {
        return getTemplates();
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

    ipcMain.handle('form:get-all', () => {
        return getForms();
    });

    ipcMain.handle('form:get-by-id', (_event, formId: string) => {
        return getFormById(formId);
    });

    ipcMain.handle('form:get-fields', (_event, formId: string) => {
        return getFormFields(formId);
    });

    // ─── Reports ─────────────────────────────────────────
    ipcMain.handle('report:generate', (_event, input: GenerateReportInput) => {
        return generateReport(input);
    });

    ipcMain.handle('report:get-all', () => {
        return getReports();
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
}

