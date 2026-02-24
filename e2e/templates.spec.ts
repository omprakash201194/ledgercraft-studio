/**
 * E2E – Template upload + placeholder parsing
 *
 * Covers:
 *  1. Clicking "Upload Template" triggers analysis and shows confirmation dialog
 *  2. Detected placeholder count and names are displayed in the dialog
 *  3. Confirming upload adds the template to the list
 *  4. Clicking "Details" on an uploaded template shows its placeholders
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

test.describe('Template upload and placeholder parsing', () => {
    test('shows upload confirmation dialog with placeholder info', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: ADMIN_USER }),
        });
        await page.goto('/#/templates');

        // Click "Upload Template"
        await page.getByRole('button', { name: /Upload Template/i }).click();

        // Confirmation dialog should appear with file info
        const dialog = page.getByRole('dialog', { name: /Confirm Upload/i });
        await expect(dialog).toBeVisible();

        // Mock pickTemplate returns 3 placeholders
        await expect(dialog.getByText('invoice.docx')).toBeVisible();
        await expect(dialog.getByText('3')).toBeVisible();

        // Individual placeholder chips
        await expect(dialog.getByText('client_name')).toBeVisible();
        await expect(dialog.getByText('amount')).toBeVisible();
        await expect(dialog.getByText('date')).toBeVisible();
    });

    test('confirming upload adds template to the list', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: ADMIN_USER }),
        });
        await page.goto('/#/templates');

        await page.getByRole('button', { name: /Upload Template/i }).click();

        const dialog = page.getByRole('dialog', { name: /Confirm Upload/i });
        await expect(dialog).toBeVisible();

        // Confirm the upload
        await dialog.getByRole('button', { name: /Confirm & Upload/i }).click();

        // Wait for success message
        await expect(page.getByText(/Template uploaded successfully/i)).toBeVisible();

        // Template name should now appear in the table
        await expect(page.getByText('invoice.docx')).toBeVisible();
    });

    test('viewing template details shows parsed placeholders', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialTemplates: [
                    {
                        id: 'tmpl-seed',
                        name: 'contract.docx',
                        file_path: '/templates/contract.docx',
                        created_at: '2024-01-01T00:00:00.000Z',
                        placeholder_count: 3,
                        category_id: null,
                    },
                ],
            }),
        });
        await page.goto('/#/templates');

        await expect(page.getByText('contract.docx')).toBeVisible();

        // Click "Details" button for the template row
        await page.getByRole('button', { name: /Details/i }).first().click();

        // Placeholders dialog should show the three keys
        const placeholderDialog = page.getByRole('dialog');
        await expect(placeholderDialog).toBeVisible();
        await expect(placeholderDialog.getByText('{{client_name}}')).toBeVisible();
        await expect(placeholderDialog.getByText('{{amount}}')).toBeVisible();
        await expect(placeholderDialog.getByText('{{date}}')).toBeVisible();
    });
});
