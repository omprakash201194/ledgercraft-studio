import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initializeStorage } from './storage';
import { database } from './database';
import { registerIpcHandlers } from './ipc/handlers';
import { bootstrapAdmin } from './auth';
import fs from "fs";

// Set app name early so userData path is consistent across dev/production
app.setName('LedgerCraftStudio');

// Suppress Electron security warnings in development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;

/* ============================
   ✅ STEP 3: LIGHT HARDENING
   Global Logging Setup
============================ */

function getLogFilePath(): string {
    const userDataPath = app.getPath("userData");
    const logsDir = path.join(userDataPath, "logs");

    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    return path.join(logsDir, "app.log");
}

function writeToLog(message: string): void {
    try {
        const logFile = getLogFilePath();
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
    } catch (err) {
        console.error("Failed to write log:", err);
    }
}

// Global crash handlers
process.on("uncaughtException", (error) => {
    writeToLog(`UNCAUGHT_EXCEPTION: ${error.stack || error.message}`);
});

process.on("unhandledRejection", (reason: any) => {
    writeToLog(`UNHANDLED_REJECTION: ${JSON.stringify(reason)}`);
});

/* ============================ */

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'LedgerCraft Studio',
        icon: path.join(__dirname, '..', 'resources', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    try {
        // 1. Initialize storage directories
        const appDataPath = initializeStorage();

        // 2. Initialize database
        database.initialize(appDataPath);

        // 3. Bootstrap default admin if no users exist
        bootstrapAdmin();

        // 4. Register IPC handlers
        registerIpcHandlers();

        // 5. Create window
        createWindow();

        writeToLog("APPLICATION_STARTED_SUCCESSFULLY");
    } catch (error: any) {
        writeToLog(`STARTUP_ERROR: ${error.stack || error.message}`);
        throw error;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    writeToLog("APPLICATION_SHUTDOWN");
    database.close();
});
