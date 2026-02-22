import type { Page } from 'playwright';

/**
 * Page Object Model for the Clients page.
 */
export class ClientsPage {
    constructor(private readonly page: Page) {}

    /** Wait for the clients list / table to be visible */
    async waitForLoad(): Promise<void> {
        await this.page.waitForSelector('text=Clients', { timeout: 15_000 });
    }

    /** Fill in the search input and wait for results */
    async search(query: string): Promise<void> {
        const searchInput = this.page.locator('input[placeholder*="Search"], input[aria-label*="search" i]').first();
        await searchInput.fill(query);
        await this.page.waitForTimeout(500); // debounce
    }

    /** Click the "New Client" / "Add Client" button */
    async clickNewClient(): Promise<void> {
        await this.page.click('button:has-text("New Client"), button:has-text("Add Client"), button:has-text("Create Client")');
    }

    /** Returns row count in the clients table */
    async getRowCount(): Promise<number> {
        const rows = this.page.locator('tbody tr, [data-testid="client-row"]');
        return rows.count();
    }

    /** Returns true if a client with the given name is visible */
    async hasClient(name: string): Promise<boolean> {
        return this.page.locator(`text="${name}"`).isVisible();
    }
}
