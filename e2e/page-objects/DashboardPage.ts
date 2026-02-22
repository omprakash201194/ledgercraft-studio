import type { Page } from 'playwright';

/**
 * Page Object Model for the Dashboard page.
 */
export class DashboardPage {
    constructor(private readonly page: Page) {}

    /** Wait until the dashboard heading is visible */
    async waitForLoad(): Promise<void> {
        await this.page.waitForSelector('text=Dashboard', { timeout: 15_000 });
    }

    /** Returns true when the dashboard heading is present */
    async isVisible(): Promise<boolean> {
        return this.page.locator('text=Dashboard').isVisible();
    }

    /** Click a navigation item in the sidebar */
    async navigateTo(label: string): Promise<void> {
        await this.page.click(`[role="navigation"] >> text="${label}"`);
    }

    /** Returns the page title shown in the main content area */
    async getPageTitle(): Promise<string | null> {
        return this.page.locator('h4, h5, h6').first().textContent();
    }
}
