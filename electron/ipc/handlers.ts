import { ipcMain, app, dialog, shell } from 'electron';
import fs from 'fs';
import { login, logout, getCurrentUser, createUser } from '../auth';
import { database } from '../database';
import { SafeUser } from '../auth';
import { uploadTemplate, getTemplates, getTemplatePlaceholders } from '../templateService';
import { createForm, getForms, getFormById, getFormFields, CreateFormInput } from '../formService';
import { generateReport, getReports, GenerateReportInput } from '../reportService';

/**
 * Register all IPC handlers.
 * Called once during app initialization.
 */
export function registerIpcHandlers(): void {
    // ─── App ─────────────────────────────────────────────
    ipcMain.handle('get-app-data-path', () => {
        return app.getPath('userData');
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
    ipcMain.handle('form:create', (_event, formData: CreateFormInput) => {
        return createForm(formData);
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

    // ─── Shell ───────────────────────────────────────────
    ipcMain.handle('shell:open-file', (_event, filePath: string) => {
        return shell.openPath(filePath);
    });
}

