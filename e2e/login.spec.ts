/**
 * E2E – Login flows (Admin / User RBAC)
 *
 * Covers:
 *  1. Correct admin credentials → redirect to dashboard
 *  2. Correct user credentials → redirect to dashboard
 *  3. Wrong credentials → error message shown
 *  4. USER role redirected away from admin-only /audit
 *  5. ADMIN role can access /audit
 *  6. Unauthenticated visit to protected route → /login
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER, REGULAR_USER } from './fixtures/mock-api';

test.describe('Login', () => {
    test('admin login with correct credentials navigates to dashboard', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript() }); // no current user
        await page.goto('/');

        await expect(page.getByText('Sign in to continue')).toBeVisible();

        await page.locator('#login-username').fill('admin');
        await page.locator('#login-password').fill('admin123');
        await page.locator('#login-submit').click();

        await expect(page.getByText('LedgerCraft Studio').first()).toBeVisible();
        await expect(page).toHaveURL(/#\/dashboard/);
    });

    test('user login with correct credentials navigates to dashboard', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript() });
        await page.goto('/');

        await page.locator('#login-username').fill('user1');
        await page.locator('#login-password').fill('pass123');
        await page.locator('#login-submit').click();

        await expect(page).toHaveURL(/#\/dashboard/);
    });

    test('wrong credentials show error alert', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript() });
        await page.goto('/#/login');

        await page.locator('#login-username').fill('admin');
        await page.locator('#login-password').fill('wrongpassword');
        await page.locator('#login-submit').click();

        await expect(page.getByText('Invalid username or password')).toBeVisible();
    });

    test('unauthenticated user is redirected to /login', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript() }); // no current user
        await page.goto('/#/templates');

        await expect(page).toHaveURL(/#\/login/);
        await expect(page.getByText('Sign in to continue')).toBeVisible();
    });

    test('RBAC: USER role is redirected away from admin-only /audit page', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: REGULAR_USER }) });
        await page.goto('/#/audit');

        await expect(page).toHaveURL(/#\/dashboard/);
    });

    test('RBAC: ADMIN role can access /audit page', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialAuditLogs: [],
            }),
        });
        await page.goto('/#/audit');

        await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    });
});
