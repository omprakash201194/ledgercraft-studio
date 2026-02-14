import { ipcMain, app } from 'electron';
import { login, logout, getCurrentUser, createUser } from '../auth';
import { database } from '../database';
import { SafeUser } from '../auth';

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
        // Return users without password hashes
        const safeUsers: SafeUser[] = users.map((u) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            created_at: u.created_at,
        }));
        return { success: true, users: safeUsers };
    });
}
