import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    // App
    ping: (): string => 'pong',
    getAppDataPath: (): Promise<string> => ipcRenderer.invoke('get-app-data-path'),

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
});
