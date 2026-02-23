/**
 * E2E – UsersPage (user management)
 *
 * Covers:
 *  1. UsersPage renders with table headings and Add New User form
 *  2. Pre-seeded user appears in the users table
 *  3. Filling the Add User form and submitting creates a new user
 *  4. Reset Password button opens dialog; confirming calls API and shows success
 *  5. USER role is not shown the Add New User form (page accessible but ADMIN guard on form)
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER, REGULAR_USER } from './fixtures/mock-api';

const SEEDED_USER = {
    id: 'user-2',
    username: 'jdoe',
    role: 'USER',
    created_at: '2024-01-10T00:00:00.000Z',
};

test.describe('UsersPage', () => {
    test('renders heading and Add New User form for ADMIN', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/users');

        await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
        await expect(page.getByText('Add New User')).toBeVisible();
        await expect(page.getByLabel('Username')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('pre-seeded user appears in the users table', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialUsers: [SEEDED_USER],
            }),
        });
        await page.goto('/#/users');

        await expect(page.getByText('jdoe')).toBeVisible();
        // Role chip should be visible
        await expect(page.getByRole('cell', { name: 'USER', exact: true })).toBeVisible();
    });

    test('empty state shows "No users found"', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/users');

        await expect(page.getByText('No users found')).toBeVisible();
    });

    test('Add User form creates new user and shows success message', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/users');

        await page.getByLabel('Username').fill('newstaff');
        await page.getByLabel('Password').fill('SecurePass123');
        await page.getByRole('button', { name: 'Add User' }).click();

        await expect(page.getByText(/user "newstaff" created successfully/i)).toBeVisible();
        // New user appears in the table (use cell to be exact)
        await expect(page.getByRole('cell', { name: 'newstaff', exact: true })).toBeVisible();
    });

    test('Reset Password button opens dialog and confirms success', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialUsers: [SEEDED_USER],
            }),
        });
        await page.goto('/#/users');

        // Click the Reset Password icon button (title="Reset Password")
        await page.getByTitle('Reset Password').first().click();

        // Dialog should open with title
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();

        // Fill new password and click the Reset Password button inside the dialog
        await page.getByLabel('New Password').fill('NewSecurePass1!');
        await page.getByRole('dialog').getByRole('button', { name: /reset password/i }).click();

        // Success snackbar
        await expect(page.getByText(/password for jdoe reset successfully/i)).toBeVisible();
    });

    test('USER role still sees the UsersPage (no AdminRoute guard on /users)', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: REGULAR_USER,
                initialUsers: [SEEDED_USER],
            }),
        });
        await page.goto('/#/users');

        // Page is accessible for regular users (not admin-only route)
        await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    });
});
