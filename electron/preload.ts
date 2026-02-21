import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    // App
    ping: (): string => 'pong',
    getAppDataPath: (): Promise<string> => ipcRenderer.invoke('get-app-data-path'),
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    getDbStatus: () => ipcRenderer.invoke('app:get-db-status'),

    // Backup
    exportBackup: () => ipcRenderer.invoke('backup:export'),
    restoreBackup: () => ipcRenderer.invoke('backup:restore'),

    // Auth
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    tryAutoLogin: () => ipcRenderer.invoke('auth:try-auto-login'),
    getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
    createUser: (username: string, password: string, role: string) => ipcRenderer.invoke('auth:create-user', username, password, role),
    getAllUsers: () => ipcRenderer.invoke('auth:get-all-users'),
    resetUserPassword: (targetUserId: string, newPassword: string) => ipcRenderer.invoke('auth:reset-password', targetUserId, newPassword),

    // Templates
    // uploadTemplate removed in favor of split flow
    pickTemplate: () => ipcRenderer.invoke('template:pick-analyze'),
    processTemplateUpload: (filePath: string, autoCreateForm: boolean, categoryId?: string | null) => ipcRenderer.invoke('template:process-upload', filePath, autoCreateForm, categoryId),
    getTemplates: (page?: number, limit?: number, categoryId?: string | null) => ipcRenderer.invoke('template:get-all', page, limit, categoryId),
    getTemplatePlaceholders: (templateId: string) => ipcRenderer.invoke('template:get-placeholders', templateId),

    // Forms
    createForm: (formData: unknown) => ipcRenderer.invoke('form:create', formData),
    updateForm: (input: unknown) => ipcRenderer.invoke('form:update', input),
    getForms: (page?: number, limit?: number, categoryId?: string | null, includeArchived?: boolean) => ipcRenderer.invoke('form:get-all', page, limit, categoryId, includeArchived),
    getFormById: (formId: string) => ipcRenderer.invoke('form:get-by-id', formId),
    getFormFields: (formId: string) => ipcRenderer.invoke('form:get-fields', formId),
    generateFormFields: (templateId: string) => ipcRenderer.invoke('form:generate-fields', templateId),
    getFormsWithHierarchy: () => ipcRenderer.invoke('form:get-hierarchy'),
    getRecentForms: (limit?: number) => ipcRenderer.invoke('form:get-recent', limit),

    // Reports
    generateReport: (input: unknown) => ipcRenderer.invoke('report:generate', input),
    getReports: (page?: number, limit?: number, formId?: string, search?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC') => ipcRenderer.invoke('report:get-all', page, limit, formId, search, sortBy, sortOrder),
    getReportById: (reportId: string) => ipcRenderer.invoke('report:get-by-id', reportId),
    deleteReport: (reportId: string) => ipcRenderer.invoke('report:delete', reportId),
    deleteReports: (reportIds: string[]) => ipcRenderer.invoke('report:delete-bulk', reportIds),
    downloadReport: (filePath: string) => ipcRenderer.invoke('report:download', filePath),

    // Categories & Lifecycle
    getCategoryTree: (type: 'TEMPLATE' | 'FORM' | 'CLIENT') => ipcRenderer.invoke('category:get-tree', type),
    getCategoryChain: (id: string) => ipcRenderer.invoke('category:get-chain', id),
    createCategory: (input: unknown) => ipcRenderer.invoke('category:create', input),
    renameCategory: (id: string, name: string, type: 'TEMPLATE' | 'FORM' | 'CLIENT') => ipcRenderer.invoke('category:rename', id, name, type),
    deleteCategory: (id: string, type: 'TEMPLATE' | 'FORM' | 'CLIENT') => ipcRenderer.invoke('category:delete', id, type),
    moveItem: (input: unknown) => ipcRenderer.invoke('item:move', input),
    deleteTemplate: (id: string, force?: boolean) => ipcRenderer.invoke('template:delete', id, force),
    deleteForm: (id: string, deleteReports?: boolean) => ipcRenderer.invoke('form:delete', id, deleteReports),
    getFormReportCount: (id: string) => ipcRenderer.invoke('form:get-report-count', id),

    // Shell
    openFile: (filePath: string) => ipcRenderer.invoke('shell:open-file', filePath),
    // Audit & Analytics
    getAuditLogs: (params: any) => ipcRenderer.invoke('audit:get-logs', params),
    getAnalytics: () => ipcRenderer.invoke('audit:get-analytics'),
    getUserPreferences: (userId: string) => ipcRenderer.invoke('prefs:get', userId),
    updateUserPreferences: (userId: string, prefs: any) => ipcRenderer.invoke('prefs:update', userId, prefs),

    // Clients
    searchClients: (query: string) => ipcRenderer.invoke('client:search', query),
    getTopClients: (limit?: number) => ipcRenderer.invoke('client:get-top', limit),
    getClientById: (clientId: string) => ipcRenderer.invoke('client:get-by-id', clientId),
    createClient: (input: any) => ipcRenderer.invoke('client:create', input),
    updateClient: (clientId: string, updates: any) => ipcRenderer.invoke('client:update', clientId, updates),
    getClientReportCount: (clientId: string) => ipcRenderer.invoke('client:get-report-count', clientId),
    deleteClientOnly: (clientId: string) => ipcRenderer.invoke('client:delete-only', clientId),
    deleteClientWithReports: (clientId: string) => ipcRenderer.invoke('client:delete-with-reports', clientId),
    exportClientReportsZip: (clientId: string) => ipcRenderer.invoke('client:export-reports-zip', clientId),
    getAllClientTypes: () => ipcRenderer.invoke('client-type:get-all'),
    getAllClientTypeFields: () => ipcRenderer.invoke('client-type:get-all-fields'),
    getClientTypeFields: (clientTypeId: string) => ipcRenderer.invoke('client-type:get-fields', clientTypeId),
    createClientType: (name: string) => ipcRenderer.invoke('client-type:create', name),
    addClientTypeField: (clientTypeId: string, input: any) => ipcRenderer.invoke('client-type:add-field', clientTypeId, input),
    softDeleteClientTypeField: (fieldId: string) => ipcRenderer.invoke('client-type:delete-field', fieldId),
});
