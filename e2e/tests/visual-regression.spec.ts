import { expect } from '@playwright/test';
import { test } from '../fixtures/electron.fixture';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * Visual Regression Test Suite
 *
 * Uses Playwright's built-in snapshot comparison (`toHaveScreenshot`) to
 * detect unintended UI changes.  Baselines are stored in
 * `e2e/tests/__screenshots__/` and committed to source control.
 *
 * To regenerate baselines after intentional design changes run:
 *   npx playwright test --update-snapshots --project=electron-e2e
 */

test.describe('Visual Regression', () => {
    test('login page matches snapshot', async ({ window }) => {
        // The login page is shown on first launch without authentication
        await expect(window.locator('#login-submit')).toBeVisible();

        await expect(window).toHaveScreenshot('login-page.png', {
            // Mask animated elements that may appear during transitions
            mask: [window.locator('[role="progressbar"]').or(window.locator('.MuiCircularProgress-root'))],
        });
    });

    test('dashboard matches snapshot after login', async ({ window }) => {
        await new LoginPage(window).login('admin', 'admin123');
        await new DashboardPage(window).waitForLoad();

        await expect(window).toHaveScreenshot('dashboard-page.png', {
            // Mask dynamic data (report dates, counts) to avoid false failures
            mask: [
                window.locator('table'),
                window.locator('[data-testid="stat-count"]'),
            ],
        });
    });
});
