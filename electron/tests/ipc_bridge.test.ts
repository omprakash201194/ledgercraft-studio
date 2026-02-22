/**
 * IPC Bridge Contract Tests
 *
 * Validates that:
 * - preload.ts exposes only the intended API surface
 * - Channel names are consistent between preload.ts and handlers.ts
 * - All exposed APIs map to registered IPC handlers
 * - No unexpected channels are exposed
 */

import { describe, it, expect } from 'vitest';

// ─── Expected API surface from preload.ts ─────────────────────────────────────

const EXPECTED_API_KEYS = [
    // App
    'ping',
    'getAppDataPath',
    'getAppVersion',
    'getDbStatus',
    // Backup
    'exportBackup',
    'restoreBackup',
    // Auth
    'login',
    'logout',
    'tryAutoLogin',
    'getCurrentUser',
    'createUser',
    'getAllUsers',
    'resetUserPassword',
    // Templates
    'pickTemplate',
    'processTemplateUpload',
    'getTemplates',
    'getTemplatePlaceholders',
    // Forms
    'createForm',
    'updateForm',
    'getForms',
    'getFormById',
    'getFormFields',
    'generateFormFields',
    'getFormsWithHierarchy',
    'getRecentForms',
    // Reports
    'generateReport',
    'getReports',
    'getReportById',
    'deleteReport',
    'deleteReports',
    'downloadReport',
    // Categories
    'getCategoryTree',
    'getCategoryChain',
    'createCategory',
    'renameCategory',
    'deleteCategory',
    'moveItem',
    'deleteTemplate',
    'deleteForm',
    'getFormReportCount',
    // Shell
    'openFile',
    // Audit & Analytics
    'getAuditLogs',
    'getAnalytics',
    'getUserPreferences',
    'updateUserPreferences',
    // Clients
    'searchClients',
    'getTopClients',
    'getClientById',
    'createClient',
    'updateClient',
    'getClientReportCount',
    'deleteClientOnly',
    'deleteClientWithReports',
    'exportClientReportsZip',
    'getAllClientTypes',
    'getAllClientTypeFields',
    'getClientTypeFields',
    'createClientType',
    'addClientTypeField',
    'softDeleteClientTypeField',
] as const;

// ─── Expected IPC channels registered in handlers.ts ─────────────────────────

const EXPECTED_IPC_CHANNELS = [
    'get-app-data-path',
    'app:get-version',
    'app:get-db-status',
    'backup:export',
    'backup:restore',
    'auth:login',
    'auth:logout',
    'auth:try-auto-login',
    'auth:get-current-user',
    'auth:create-user',
    'auth:get-all-users',
    'auth:reset-password',
    'template:pick-analyze',
    'template:process-upload',
    'template:get-all',
    'template:get-placeholders',
    'template:delete',
    'form:create',
    'form:update',
    'form:get-all',
    'form:get-by-id',
    'form:get-fields',
    'form:generate-fields',
    'form:get-hierarchy',
    'form:get-recent',
    'form:delete',
    'form:get-report-count',
    'report:generate',
    'report:get-all',
    'report:get-by-id',
    'report:delete',
    'report:delete-bulk',
    'report:download',
    'category:get-tree',
    'category:get-chain',
    'category:create',
    'category:rename',
    'category:delete',
    'item:move',
    'shell:open-file',
    'audit:get-logs',
    'audit:get-analytics',
    'prefs:get',
    'prefs:update',
    'client:search',
    'client:get-top',
    'client:get-by-id',
    'client:create',
    'client:update',
    'client:get-report-count',
    'client:delete-only',
    'client:delete-with-reports',
    'client:export-reports-zip',
    'client-type:get-all',
    'client-type:get-all-fields',
    'client-type:get-fields',
    'client-type:create',
    'client-type:add-field',
    'client-type:delete-field',
] as const;

// ─── Mapping: preload API key → IPC channel ───────────────────────────────────

const PRELOAD_TO_CHANNEL_MAP: Record<string, string> = {
    ping: '', // No IPC channel - returns 'pong' directly
    getAppDataPath: 'get-app-data-path',
    getAppVersion: 'app:get-version',
    getDbStatus: 'app:get-db-status',
    exportBackup: 'backup:export',
    restoreBackup: 'backup:restore',
    login: 'auth:login',
    logout: 'auth:logout',
    tryAutoLogin: 'auth:try-auto-login',
    getCurrentUser: 'auth:get-current-user',
    createUser: 'auth:create-user',
    getAllUsers: 'auth:get-all-users',
    resetUserPassword: 'auth:reset-password',
    pickTemplate: 'template:pick-analyze',
    processTemplateUpload: 'template:process-upload',
    getTemplates: 'template:get-all',
    getTemplatePlaceholders: 'template:get-placeholders',
    createForm: 'form:create',
    updateForm: 'form:update',
    getForms: 'form:get-all',
    getFormById: 'form:get-by-id',
    getFormFields: 'form:get-fields',
    generateFormFields: 'form:generate-fields',
    getFormsWithHierarchy: 'form:get-hierarchy',
    getRecentForms: 'form:get-recent',
    generateReport: 'report:generate',
    getReports: 'report:get-all',
    getReportById: 'report:get-by-id',
    deleteReport: 'report:delete',
    deleteReports: 'report:delete-bulk',
    downloadReport: 'report:download',
    getCategoryTree: 'category:get-tree',
    getCategoryChain: 'category:get-chain',
    createCategory: 'category:create',
    renameCategory: 'category:rename',
    deleteCategory: 'category:delete',
    moveItem: 'item:move',
    deleteTemplate: 'template:delete',
    deleteForm: 'form:delete',
    getFormReportCount: 'form:get-report-count',
    openFile: 'shell:open-file',
    getAuditLogs: 'audit:get-logs',
    getAnalytics: 'audit:get-analytics',
    getUserPreferences: 'prefs:get',
    updateUserPreferences: 'prefs:update',
    searchClients: 'client:search',
    getTopClients: 'client:get-top',
    getClientById: 'client:get-by-id',
    createClient: 'client:create',
    updateClient: 'client:update',
    getClientReportCount: 'client:get-report-count',
    deleteClientOnly: 'client:delete-only',
    deleteClientWithReports: 'client:delete-with-reports',
    exportClientReportsZip: 'client:export-reports-zip',
    getAllClientTypes: 'client-type:get-all',
    getAllClientTypeFields: 'client-type:get-all-fields',
    getClientTypeFields: 'client-type:get-fields',
    createClientType: 'client-type:create',
    addClientTypeField: 'client-type:add-field',
    softDeleteClientTypeField: 'client-type:delete-field',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IPC Bridge Contract Tests', () => {

    describe('API surface completeness', () => {
        it('should have all expected API keys defined in the contract', () => {
            const definedKeys = Object.keys(PRELOAD_TO_CHANNEL_MAP);
            for (const key of EXPECTED_API_KEYS) {
                expect(definedKeys, `API key "${key}" should be in the contract map`).toContain(key);
            }
        });

        it('should have no extra undefined API keys in the contract', () => {
            for (const key of Object.keys(PRELOAD_TO_CHANNEL_MAP)) {
                expect(EXPECTED_API_KEYS as readonly string[], `Unexpected API key "${key}" found in contract map`).toContain(key);
            }
        });

        it('should expose exactly the expected number of API methods', () => {
            expect(EXPECTED_API_KEYS.length).toBe(Object.keys(PRELOAD_TO_CHANNEL_MAP).length);
        });
    });

    describe('Channel name consistency', () => {
        it('should have all non-ping API keys mapping to a registered IPC channel', () => {
            for (const [apiKey, channel] of Object.entries(PRELOAD_TO_CHANNEL_MAP)) {
                if (apiKey === 'ping') continue; // 'ping' has no IPC channel
                expect(
                    EXPECTED_IPC_CHANNELS as readonly string[],
                    `API "${apiKey}" maps to channel "${channel}" which is not in registered handlers`
                ).toContain(channel);
            }
        });

        it('should have all registered IPC channels mapped to at least one API key', () => {
            const usedChannels = new Set(Object.values(PRELOAD_TO_CHANNEL_MAP).filter(Boolean));
            for (const channel of EXPECTED_IPC_CHANNELS) {
                expect(
                    [...usedChannels],
                    `IPC channel "${channel}" is registered in handlers but not exposed via preload`
                ).toContain(channel);
            }
        });

        it('should use consistent namespace prefixes in channel names', () => {
            const validPrefixes = ['auth:', 'template:', 'form:', 'report:', 'category:', 'item:', 'audit:', 'prefs:', 'client:', 'client-type:', 'backup:', 'app:', 'shell:'];
            // Legacy channel predating the namespace convention
            const legacyChannels = ['get-app-data-path'];
            for (const channel of EXPECTED_IPC_CHANNELS) {
                if (legacyChannels.includes(channel)) continue;
                const hasValidPrefix = validPrefixes.some(prefix => channel.startsWith(prefix));
                expect(hasValidPrefix, `Channel "${channel}" does not use a recognized namespace prefix`).toBe(true);
            }
        });
    });

    describe('Auth API surface', () => {
        it('should expose all authentication-related methods', () => {
            const authMethods = ['login', 'logout', 'tryAutoLogin', 'getCurrentUser', 'createUser', 'getAllUsers', 'resetUserPassword'];
            for (const method of authMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });
    });

    describe('Client API surface', () => {
        it('should expose CRUD operations for clients', () => {
            const clientMethods = ['searchClients', 'getClientById', 'createClient', 'updateClient'];
            for (const method of clientMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });

        it('should expose client deletion methods', () => {
            expect(EXPECTED_API_KEYS as readonly string[]).toContain('deleteClientOnly');
            expect(EXPECTED_API_KEYS as readonly string[]).toContain('deleteClientWithReports');
        });

        it('should expose client type management methods', () => {
            const clientTypeMethods = ['getAllClientTypes', 'getClientTypeFields', 'createClientType', 'addClientTypeField', 'softDeleteClientTypeField'];
            for (const method of clientTypeMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });
    });

    describe('Report API surface', () => {
        it('should expose report generation and retrieval methods', () => {
            const reportMethods = ['generateReport', 'getReports', 'getReportById', 'deleteReport', 'deleteReports', 'downloadReport'];
            for (const method of reportMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });
    });

    describe('Template and Form API surface', () => {
        it('should expose template management methods', () => {
            const templateMethods = ['pickTemplate', 'processTemplateUpload', 'getTemplates', 'getTemplatePlaceholders', 'deleteTemplate'];
            for (const method of templateMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });

        it('should expose form management methods', () => {
            const formMethods = ['createForm', 'updateForm', 'getForms', 'getFormById', 'getFormFields', 'generateFormFields', 'deleteForm'];
            for (const method of formMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });
    });

    describe('Category API surface', () => {
        it('should expose category lifecycle methods', () => {
            const categoryMethods = ['getCategoryTree', 'getCategoryChain', 'createCategory', 'renameCategory', 'deleteCategory', 'moveItem'];
            for (const method of categoryMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).toContain(method);
            }
        });
    });

    describe('Audit and Preferences API surface', () => {
        it('should expose audit log methods', () => {
            expect(EXPECTED_API_KEYS as readonly string[]).toContain('getAuditLogs');
            expect(EXPECTED_API_KEYS as readonly string[]).toContain('getAnalytics');
        });

        it('should expose user preferences methods', () => {
            expect(EXPECTED_API_KEYS as readonly string[]).toContain('getUserPreferences');
            expect(EXPECTED_API_KEYS as readonly string[]).toContain('updateUserPreferences');
        });
    });

    describe('No Node.js leakage', () => {
        it('should not expose any Node.js module names directly', () => {
            const nodeModules = ['fs', 'path', 'os', 'child_process', 'net', 'http', 'https', 'crypto', 'buffer'];
            for (const mod of nodeModules) {
                expect(EXPECTED_API_KEYS as readonly string[]).not.toContain(mod);
            }
        });

        it('should not expose any Electron internals', () => {
            const electronInternals = ['ipcRenderer', 'ipcMain', 'contextBridge', 'app', 'BrowserWindow', 'dialog', 'shell'];
            for (const internal of electronInternals) {
                expect(EXPECTED_API_KEYS as readonly string[]).not.toContain(internal);
            }
        });

        it('should not expose database connection methods directly', () => {
            const dbMethods = ['database', 'getConnection', 'initialize', 'close', 'exec', 'prepare', 'transaction'];
            for (const method of dbMethods) {
                expect(EXPECTED_API_KEYS as readonly string[]).not.toContain(method);
            }
        });
    });
});
