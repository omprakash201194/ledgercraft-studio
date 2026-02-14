import { ipcMain, app } from 'electron';

/**
 * Register all IPC handlers.
 * Called once during app initialization.
 */
export function registerIpcHandlers(): void {
    ipcMain.handle('get-app-data-path', () => {
        return app.getPath('userData');
    });
}
