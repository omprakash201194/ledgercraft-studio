/**
 * E2E – Soft delete behavior (Client Type field soft-delete)
 *
 * Covers:
 *  1. A client type field is visible in the Manage Fields dialog
 *  2. Clicking the delete icon calls softDeleteClientTypeField
 *  3. The field is removed from the dialog after deletion (soft-deleted fields
 *     are filtered out by getClientTypeFields on reload)
 *  4. Other fields in the same client type remain visible
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

const CLIENT_TYPE = {
    id: 'ct-corp',
    name: 'Corporate',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
};

const FIELDS = [
    {
        id: 'ctf-gst',
        client_type_id: 'ct-corp',
        label: 'GST Number',
        field_key: 'gst_number',
        data_type: 'text',
        is_required: 0,
        is_deleted: 0,
        created_at: '2024-01-01T00:00:00.000Z',
    },
    {
        id: 'ctf-pan',
        client_type_id: 'ct-corp',
        label: 'PAN',
        field_key: 'pan',
        data_type: 'text',
        is_required: 1,
        is_deleted: 0,
        created_at: '2024-01-01T00:00:00.000Z',
    },
];

test.describe('Soft delete behavior', () => {
    test('client-type fields are visible in Manage Fields dialog', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialClientTypes: [CLIENT_TYPE],
                initialClientTypeFields: FIELDS,
            }),
        });
        await page.goto('/#/client-types');

        // Open "Manage Fields" for the Corporate type
        await page.getByRole('button', { name: /Manage Fields/i }).first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        await expect(dialog.getByText('GST Number')).toBeVisible();
        await expect(dialog.getByText('PAN', { exact: true }).first()).toBeVisible();
    });

    test('soft-deleting a field removes it from the dialog', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialClientTypes: [CLIENT_TYPE],
                initialClientTypeFields: FIELDS,
            }),
        });
        await page.goto('/#/client-types');

        // Open Manage Fields
        await page.getByRole('button', { name: /Manage Fields/i }).first().click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('GST Number')).toBeVisible();

        // Click the delete (trash) icon for "GST Number"
        // Each field row has a delete IconButton; click the first one (GST Number row)
        const gstRow = dialog.locator('li').filter({ hasText: 'GST Number' });
        await gstRow.getByRole('button').click();

        // After soft delete, GST Number should disappear (getClientTypeFields filters is_deleted)
        await expect(dialog.getByText('GST Number')).not.toBeVisible();

        // PAN (the other field) must remain visible
        await expect(dialog.getByText('PAN', { exact: true }).first()).toBeVisible();
    });

    test('soft-deleted field does not appear in client creation form', async ({ page }) => {
        const fieldsWithDeleted = [
            ...FIELDS,
            {
                id: 'ctf-deleted',
                client_type_id: 'ct-corp',
                label: 'Deleted Field',
                field_key: 'deleted_field',
                data_type: 'text',
                is_required: 0,
                is_deleted: 1, // already soft-deleted
                created_at: '2024-01-01T00:00:00.000Z',
            },
        ];

        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialClientTypes: [CLIENT_TYPE],
                initialClientTypeFields: fieldsWithDeleted,
            }),
        });
        await page.goto('/#/clients');

        await page.getByRole('button', { name: /Create Client/i }).click();

        const dialog = page.getByRole('dialog', { name: /Create Client/i });
        await expect(dialog).toBeVisible();

        // Select the client type (MUI Select uses role="combobox")
        await dialog.locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'Corporate' }).click();

        // Active fields are visible
        await expect(dialog.getByLabel('GST Number')).toBeVisible();
        await expect(dialog.getByLabel('PAN')).toBeVisible();

        // Soft-deleted field must NOT appear
        await expect(dialog.getByLabel('Deleted Field')).not.toBeVisible();
    });
});
