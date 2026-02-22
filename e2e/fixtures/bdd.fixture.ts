/**
 * BDD fixture — extends playwright-bdd's `test` with the same Electron fixtures
 * defined in electron.fixture.ts so that step definitions can use `createBdd(test)`
 * while still having access to the `electronApp` and `window` fixtures.
 *
 * playwright-bdd requires that the `test` passed to `createBdd()` originates from
 * `playwright-bdd`'s own `test`, not from `@playwright/test` directly.
 */
import { test as bddBase } from 'playwright-bdd';
import { _electron as electron } from 'playwright';
import type { ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';

type ElectronFixtures = {
    electronApp: ElectronApplication;
    window: Page;
};

const MAIN_PATH = path.join(process.cwd(), 'dist', 'electron', 'main.js');

export const test = bddBase.extend<ElectronFixtures>({
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

    window: async ({ electronApp }, use) => {
        const page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await use(page);
    },
});

export { expect } from '@playwright/test';
