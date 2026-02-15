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
    getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
    createUser: (username: string, password: string, role: string) => ipcRenderer.invoke('auth:create-user', username, password, role),
    getAllUsers: () => ipcRenderer.invoke('auth:get-all-users'),

    // Templates
    uploadTemplate: () => ipcRenderer.invoke('template:upload'),
    getTemplates: () => ipcRenderer.invoke('template:get-all'),
    getTemplatePlaceholders: (templateId: string) => ipcRenderer.invoke('template:get-placeholders', templateId),

    // Forms
    createForm: (formData: unknown) => ipcRenderer.invoke('form:create', formData),
    updateForm: (input: unknown) => ipcRenderer.invoke('form:update', input),
    getForms: () => ipcRenderer.invoke('form:get-all'),
    getFormById: (formId: string) => ipcRenderer.invoke('form:get-by-id', formId),
    getFormFields: (formId: string) => ipcRenderer.invoke('form:get-fields', formId),

    // Reports
    generateReport: (input: unknown) => ipcRenderer.invoke('report:generate', input),
    getReports: () => ipcRenderer.invoke('report:get-all'),
    downloadReport: (filePath: string) => ipcRenderer.invoke('report:download', filePath),

    // Categories & Lifecycle
    getCategoryTree: (type: 'TEMPLATE' | 'FORM') => ipcRenderer.invoke('category:get-tree', type),
    createCategory: (input: unknown) => ipcRenderer.invoke('category:create', input),
    renameCategory: (id: string, newName: string) => ipcRenderer.invoke('category:rename', id, newName),
    deleteCategory: (id: string, type: 'TEMPLATE' | 'FORM') => ipcRenderer.invoke('category:delete', id, type),
    moveItem: (input: unknown) => ipcRenderer.invoke('item:move', input),
    deleteTemplate: (id: string) => ipcRenderer.invoke('template:delete', id),
    deleteForm: (id: string) => ipcRenderer.invoke('form:delete', id),

    // Shell
    openFile: (filePath: string) => ipcRenderer.invoke('shell:open-file', filePath),
});
