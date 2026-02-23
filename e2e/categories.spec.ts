/**
 * E2E – Category creation (hierarchical)
 *
 * Covers:
 *  1. Create a root TEMPLATE category via the "+" button
 *  2. Create a child (sub) category under an existing root
 *  3. Tree shows hierarchical names after creation
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

test.describe('Category creation', () => {
    test('creates a root TEMPLATE category', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: ADMIN_USER }),
        });
        await page.goto('/#/templates');

        // Click the "+" icon button in the CategoryTree header (Create Root Category)
        await page.getByRole('button', { name: 'Create Root Category' }).click();

        // Fill in category name and submit
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByLabel('Category Name').fill('Finance');
        await dialog.getByRole('button', { name: 'Create' }).click();

        // Newly created category should now appear in the tree
        await expect(page.getByText('Finance')).toBeVisible();
    });

    test('creates a child category under an existing root', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialCategories: [
                    {
                        id: 'cat-finance',
                        name: 'Finance',
                        parent_id: null,
                        type: 'TEMPLATE',
                        created_at: '2024-01-01T00:00:00.000Z',
                    },
                ],
            }),
        });
        await page.goto('/#/templates');

        // Verify root category is visible
        await expect(page.getByText('Finance')).toBeVisible();

        // Hover over "Finance" tree item to reveal the "..." context menu button
        const financeItem = page.getByText('Finance');
        await financeItem.hover();

        // Click the MoreVert icon button inside the Finance tree item
        const treeItemContent = page.locator('.MuiTreeItem-content').filter({ hasText: 'Finance' });
        await treeItemContent.hover();
        const moreButton = treeItemContent.locator('button').last();
        await moreButton.click({ force: true });

        // Click "Add Subcategory" in the context menu
        await page.getByRole('menuitem', { name: /Add Subcategory/i }).click();

        // Fill in the sub-category name
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByLabel('Category Name').fill('Invoices');
        await dialog.getByRole('button', { name: 'Create' }).click();

        // Both parent and child names should be visible in tree
        // Use exact: true so the dialog title "Add Subcategory to "Finance"" doesn't match
        await expect(page.getByText('Finance', { exact: true })).toBeVisible();
        await expect(page.getByText('Invoices')).toBeVisible();
    });
});
