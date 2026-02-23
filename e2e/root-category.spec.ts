/**
 * E2E – Root category listing
 *
 * Covers:
 *  1. Root categories pre-loaded from state appear in the TEMPLATE tree
 *  2. Root categories pre-loaded from state appear in the CLIENT tree
 *  3. "All Items" root node is always visible
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

const SEED_CATEGORIES = [
    { id: 'cat-finance', name: 'Finance', parent_id: null, type: 'TEMPLATE', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 'cat-legal', name: 'Legal', parent_id: null, type: 'TEMPLATE', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 'cat-client-corp', name: 'Corporate', parent_id: null, type: 'CLIENT', created_at: '2024-01-01T00:00:00.000Z' },
];

test.describe('Root category listing', () => {
    test('TEMPLATE tree lists all root categories', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialCategories: SEED_CATEGORIES,
            }),
        });
        await page.goto('/#/templates');

        // "All Items" root node is always present
        await expect(page.getByText('All Items').first()).toBeVisible();

        // Seeded TEMPLATE root categories are visible
        await expect(page.getByText('Finance')).toBeVisible();
        await expect(page.getByText('Legal')).toBeVisible();

        // CLIENT-type category must NOT appear in TEMPLATE tree
        await expect(page.getByText('Corporate')).not.toBeVisible();
    });

    test('CLIENT tree lists all root categories', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialCategories: SEED_CATEGORIES,
            }),
        });
        await page.goto('/#/clients');

        await expect(page.getByText('All Items').first()).toBeVisible();
        await expect(page.getByText('Corporate')).toBeVisible();
    });

    test('"All Items" node is visible even when no categories exist', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: ADMIN_USER }),
        });
        await page.goto('/#/templates');

        await expect(page.getByText('All Items').first()).toBeVisible();
    });
});
