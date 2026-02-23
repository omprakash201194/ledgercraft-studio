/**
 * E2E – Client creation with dynamic fields
 *
 * Covers:
 *  1. "Create Client" button opens dialog
 *  2. Selecting a Client Type loads its dynamic fields
 *  3. Filling required dynamic fields and saving creates the client
 *  4. Created client appears in the list
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

const CLIENT_TYPES = [
    {
        id: 'ct-individual',
        name: 'Individual',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
    },
];

const CLIENT_TYPE_FIELDS = [
    {
        id: 'ctf-email',
        client_type_id: 'ct-individual',
        label: 'Email',
        field_key: 'email',
        data_type: 'text',
        is_required: 1,
        is_deleted: 0,
        created_at: '2024-01-01T00:00:00.000Z',
    },
    {
        id: 'ctf-phone',
        client_type_id: 'ct-individual',
        label: 'Phone',
        field_key: 'phone',
        data_type: 'text',
        is_required: 0,
        is_deleted: 0,
        created_at: '2024-01-01T00:00:00.000Z',
    },
];

test.describe('Client creation with dynamic fields', () => {
    test('opens create-client dialog when button is clicked', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialClientTypes: CLIENT_TYPES,
                initialClientTypeFields: CLIENT_TYPE_FIELDS,
            }),
        });
        await page.goto('/#/clients');

        await page.getByRole('button', { name: /Create Client/i }).click();

        const dialog = page.getByRole('dialog', { name: /Create Client/i });
        await expect(dialog).toBeVisible();
    });

    test('selecting a client type reveals dynamic fields', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialClientTypes: CLIENT_TYPES,
                initialClientTypeFields: CLIENT_TYPE_FIELDS,
            }),
        });
        await page.goto('/#/clients');

        await page.getByRole('button', { name: /Create Client/i }).click();

        const dialog = page.getByRole('dialog', { name: /Create Client/i });
        await expect(dialog).toBeVisible();

        // Select Client Type dropdown (MUI Select uses role="combobox")
        await dialog.locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'Individual' }).click();

        // Dynamic fields from CLIENT_TYPE_FIELDS should now appear
        await expect(dialog.getByLabel('Email')).toBeVisible();
        await expect(dialog.getByLabel('Phone')).toBeVisible();
    });

    test('fills dynamic fields and saves client, client appears in list', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialClientTypes: CLIENT_TYPES,
                initialClientTypeFields: CLIENT_TYPE_FIELDS,
            }),
        });
        await page.goto('/#/clients');

        await page.getByRole('button', { name: /Create Client/i }).click();

        const dialog = page.getByRole('dialog', { name: /Create Client/i });
        await expect(dialog).toBeVisible();

        // Fill client name
        await dialog.getByLabel('Client Name').fill('Acme Corp');

        // Select type (MUI Select uses role="combobox")
        await dialog.locator('[role="combobox"]').click();
        await page.getByRole('option', { name: 'Individual' }).click();

        // Fill required Email field
        await dialog.getByLabel('Email').fill('acme@example.com');

        // Save
        await dialog.getByRole('button', { name: /Save/i }).click();

        // Success snackbar
        await expect(page.getByText(/Client created successfully/i)).toBeVisible();

        // Client appears in the table
        await expect(page.getByText('Acme Corp')).toBeVisible();
    });
});
