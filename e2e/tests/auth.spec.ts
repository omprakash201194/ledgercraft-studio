import { expect } from '@playwright/test';
import { test } from '../fixtures/electron.fixture';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * Authentication Business Flow Validation Suite
 *
 * Covers:
 *  - Login page renders correctly
 *  - Successful login redirects to dashboard
 *  - Invalid credentials show an error
 *  - Unauthenticated access is blocked
 *  - Logout returns user to login page
 */

test.describe('Authentication', () => {
    test('login page is displayed on launch', async ({ window }) => {
        const loginPage = new LoginPage(window);
        await expect(window.locator('#login-submit')).toBeVisible();
        expect(await loginPage.isVisible()).toBe(true);
    });

    test('successful login navigates to dashboard', async ({ window }) => {
        const loginPage = new LoginPage(window);
        const dashboardPage = new DashboardPage(window);

        await loginPage.login('admin', 'admin123');
        await dashboardPage.waitForLoad();

        expect(await dashboardPage.isVisible()).toBe(true);
    });

    test('invalid credentials show an error alert', async ({ window }) => {
        const loginPage = new LoginPage(window);

        await loginPage.fillCredentials('admin', 'wrongpassword');
        await loginPage.submit();

        // Wait for the error alert to appear
        await expect(window.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
        const errorText = await loginPage.getErrorText();
        expect(errorText).toBeTruthy();
        expect(errorText?.toLowerCase()).toMatch(/invalid|incorrect|wrong|failed/);
    });

    test('Sign In button is disabled without credentials', async ({ window }) => {
        const submitBtn = window.locator('#login-submit');
        await expect(submitBtn).toBeDisabled();
    });

    test('Sign In button becomes enabled when credentials are entered', async ({ window }) => {
        const loginPage = new LoginPage(window);
        await loginPage.fillCredentials('admin', 'admin123');
        await expect(window.locator('#login-submit')).toBeEnabled();
    });

    test('logout returns user to login page', async ({ window }) => {
        const loginPage = new LoginPage(window);
        const dashboardPage = new DashboardPage(window);

        // Log in first
        await loginPage.login('admin', 'admin123');
        await dashboardPage.waitForLoad();

        // Trigger logout via the API bridge (most reliable approach)
        await window.evaluate(() => (window as any).api.logout());
        await window.reload();

        // Should now be on login page
        await expect(window.locator('#login-submit')).toBeVisible({ timeout: 10_000 });
    });
});
