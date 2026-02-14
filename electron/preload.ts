import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    ping: (): string => 'pong',
    getAppDataPath: (): Promise<string> => ipcRenderer.invoke('get-app-data-path'),
});
