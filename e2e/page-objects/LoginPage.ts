import type { Page } from 'playwright';

/**
 * Page Object Model for the Login page.
 * Encapsulates all selectors and interactions so test files remain concise.
 */
export class LoginPage {
    constructor(private readonly page: Page) {}

    /** Fill in the username field */
    async fillUsername(username: string): Promise<void> {
        await this.page.fill('#login-username', username);
    }

    /** Fill in the password field */
    async fillPassword(password: string): Promise<void> {
        await this.page.fill('#login-password', password);
    }

    /** Fill both credentials in one call */
    async fillCredentials(username: string, password: string): Promise<void> {
        await this.fillUsername(username);
        await this.fillPassword(password);
    }

    /** Click the Sign-In submit button */
    async submit(): Promise<void> {
        await this.page.click('#login-submit');
    }

    /** Convenience: fill credentials and submit */
    async login(username: string, password: string): Promise<void> {
        await this.fillCredentials(username, password);
        await this.submit();
    }

    /** Returns the visible error alert text, or null if no error is shown */
    async getErrorText(): Promise<string | null> {
        const alert = this.page.locator('[role="alert"]');
        const visible = await alert.isVisible().catch(() => false);
        return visible ? alert.textContent() : null;
    }

    /** Returns true when the login form is visible */
    async isVisible(): Promise<boolean> {
        return this.page.locator('#login-submit').isVisible();
    }
}
