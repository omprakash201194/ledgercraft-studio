import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Initializes the app data directory structure.
 * Uses Electron's app.getPath('userData') which resolves to:
 * Windows: C:\Users\<User>\AppData\Roaming\LedgerCraftStudio
 */
export function initializeStorage(): string {
    const appDataPath = app.getPath('userData');

    const subdirectories = ['templates', 'reports', 'logs'];

    for (const dir of subdirectories) {
        const dirPath = path.join(appDataPath, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    console.log(`[Storage] App data directory initialized: ${appDataPath}`);
    return appDataPath;
}

/**
 * Returns the app data path without initialization.
 */
export function getAppDataPath(): string {
    return app.getPath('userData');
}
