
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { app } from 'electron';
import { database } from './database';

export interface BackupResult {
    success: boolean;
    error?: string;
}

export function exportBackup(targetPath: string): BackupResult {
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'database.sqlite');
        const templatesDir = path.join(userDataPath, 'templates');
        const reportsDir = path.join(userDataPath, 'reports');

        const zip = new AdmZip();

        // 1. Add Database
        if (fs.existsSync(dbPath)) {
            zip.addLocalFile(dbPath);
        } else {
            return { success: false, error: 'Database file not found.' };
        }

        // 2. Add Templates
        if (fs.existsSync(templatesDir)) {
            zip.addLocalFolder(templatesDir, 'templates');
        }

        // 3. Add Reports
        if (fs.existsSync(reportsDir)) {
            zip.addLocalFolder(reportsDir, 'reports');
        }

        // 4. Write Zip
        zip.writeZip(targetPath);
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

export function restoreBackup(sourcePath: string): BackupResult {
    try {
        const userDataPath = app.getPath('userData');
        const zip = new AdmZip(sourcePath);
        const zipEntries = zip.getEntries();

        // 1. Validate - check for database.sqlite
        const hasDb = zipEntries.some(entry => entry.entryName === 'database.sqlite');
        if (!hasDb) {
            return { success: false, error: 'Invalid backup: missing database.sqlite' };
        }

        // 2. Close Database Connection
        try {
            database.close();
        } catch (e) {
            console.warn('Database close warning:', e);
        }

        // 3. Prepare directories (Templates & Reports)
        // We wipe them to ensure clean state matching backup
        const templatesDir = path.join(userDataPath, 'templates');
        const reportsDir = path.join(userDataPath, 'reports');

        if (fs.existsSync(templatesDir)) {
            fs.rmSync(templatesDir, { recursive: true, force: true });
        }
        if (fs.existsSync(reportsDir)) {
            fs.rmSync(reportsDir, { recursive: true, force: true });
        }

        // 4. Extract
        zip.extractAllTo(userDataPath, true);

        // 5. Restart App to reload DB connection
        app.relaunch();
        app.exit();

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}
