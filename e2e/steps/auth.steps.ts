import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/bdd.fixture';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd(test);

// ─── Background ──────────────────────────────────────────────────────────────

Given('the application is launched', async ({ window }) => {
    await window.waitForLoadState('domcontentloaded');
    await expect(window.locator('#login-submit')).toBeVisible();
});

Given('I am logged in as admin', async ({ window }) => {
    const loginPage = new LoginPage(window);
    const dashboardPage = new DashboardPage(window);

    await loginPage.login('admin', 'admin123');
    await dashboardPage.waitForLoad();
});

// ─── When ─────────────────────────────────────────────────────────────────────

When('I enter username {string} and password {string}', async ({ window }, username: string, password: string) => {
    const loginPage = new LoginPage(window);
    await loginPage.fillCredentials(username, password);
});

When('I click the Sign In button', async ({ window }) => {
    const loginPage = new LoginPage(window);
    await loginPage.submit();
});

When('I log out of the application', async ({ window }) => {
    await window.evaluate(() => (window as any).api.logout());
    await window.reload();
});

// ─── Then ─────────────────────────────────────────────────────────────────────

Then('I should be redirected to the dashboard', async ({ window }) => {
    await new DashboardPage(window).waitForLoad();
    expect(await new DashboardPage(window).isVisible()).toBe(true);
});

Then('the navigation menu should be visible', async ({ window }) => {
    const nav = window.locator('[data-testid="main-navigation"]');
    await expect(nav).toBeVisible();
});

Then('I should see an authentication error', async ({ window }) => {
    await expect(window.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
});

Then('I should remain on the login page', async ({ window }) => {
    await expect(window.locator('#login-submit')).toBeVisible();
});

Then('the Sign In button should be disabled', async ({ window }) => {
    await expect(window.locator('#login-submit')).toBeDisabled();
});

Then('I should be redirected to the login page', async ({ window }) => {
    await expect(window.locator('#login-submit')).toBeVisible({ timeout: 10_000 });
});
