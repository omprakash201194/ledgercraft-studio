import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bdd.fixture';
import { expect } from '@playwright/test';

const { Then } = createBdd(test);

// ─── Reports page assertions ──────────────────────────────────────────────────

Then('the Reports page should be visible', async ({ window }) => {
    await expect(window.locator('text=Reports').first()).toBeVisible({ timeout: 10_000 });
});

Then('the Generate Report page should be visible', async ({ window }) => {
    await expect(window.locator('text=Generate').first()).toBeVisible({ timeout: 10_000 });
});

Then('the Templates page should be visible', async ({ window }) => {
    await expect(window.locator('text=Templates').first()).toBeVisible({ timeout: 10_000 });
});
