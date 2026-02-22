import { test as base } from '@playwright/test';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Custom fixtures that launch the packaged Electron app and expose:
 *  - `electronApp` — the ElectronApplication handle
 *  - `window`      — the first BrowserWindow Page
 */
type ElectronFixtures = {
    electronApp: ElectronApplication;
    window: Page;
};

/**
 * Path to the compiled Electron main process entry-point.
 * The app must be built before running E2E tests:
 *   npm run build:electron && npm run build:renderer
 */
const MAIN_PATH = path.join(process.cwd(), 'dist', 'electron', 'main.js');

export const test = base.extend<ElectronFixtures>({
    /**
     * Launch a fresh Electron instance for each test.
     * A temporary user-data directory is created to ensure full isolation
     * between test runs (clean SQLite DB, no stale session files).
     */
    electronApp: async ({}, use) => {
        if (!fs.existsSync(MAIN_PATH)) {
            throw new Error(
                `Electron main process not found at "${MAIN_PATH}".\n` +
                'Build the app first: npm run build:electron && npm run build:renderer',
            );
        }

        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcs-e2e-'));

        const app = await electron.launch({
            args: [MAIN_PATH, `--user-data-dir=${userDataDir}`],
            env: {
                ...process.env,
                NODE_ENV: 'test',
                ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
            },
        });

        await use(app);

        await app.close();
        fs.rmSync(userDataDir, { recursive: true, force: true });
    },

    /**
     * Resolve the first BrowserWindow and wait for it to be fully loaded.
     */
    window: async ({ electronApp }, use) => {
        const page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        // Short wait for React to finish its initial render cycle
        await page.waitForTimeout(500);
        await use(page);
    },
});

export { expect } from '@playwright/test';
