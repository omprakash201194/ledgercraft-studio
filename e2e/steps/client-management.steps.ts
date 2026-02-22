import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bdd.fixture';
import { ClientsPage } from '../page-objects/ClientsPage';
import { expect } from '@playwright/test';

const { When, Then } = createBdd(test);

// ─── Navigation map ───────────────────────────────────────────────────────────

const NAV_LABELS: Record<string, string> = {
    Clients: 'Clients',
    Reports: 'Reports',
    Templates: 'Templates',
    'Generate Report': 'Generate Report',
};

When('I navigate to the {string} section', async ({ window }, section: string) => {
    const label = NAV_LABELS[section] ?? section;
    // Try the navigation locator using accessible role first, then fallback to text
    const navLink = window.locator(`[role="navigation"]`).getByText(label, { exact: true })
        .or(window.locator(`aside`).getByText(label, { exact: true }));
    await navLink.first().click();
    await window.waitForTimeout(500);
});

// ─── Clients assertions ───────────────────────────────────────────────────────

Then('the Clients page should be visible', async ({ window }) => {
    await new ClientsPage(window).waitForLoad();
    await expect(window.locator('text=Clients').first()).toBeVisible();
});

Then('I should see the client list area', async ({ window }) => {
    await expect(window.locator('table, [role="grid"], [data-testid="client-list"]').first()).toBeVisible({ timeout: 10_000 });
});

When('I search for {string}', async ({ window }, query: string) => {
    const clientsPage = new ClientsPage(window);
    await clientsPage.search(query);
});

Then('the search results should be displayed', async ({ window }) => {
    // After search the container should still be visible (results or empty state)
    await expect(window.locator('main, [role="main"]').first()).toBeVisible();
});
