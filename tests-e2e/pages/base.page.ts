import { Page, expect } from '@playwright/test';
import { logger } from '../utils/logger';

export class BasePage {
    constructor(protected readonly page: Page) {}

    async waitForPageToLoad() {
        await this.page.waitForLoadState('domcontentloaded');
    }

    async getUrl(): Promise<string> {
        return this.page.url();
    }

    async verifyUrlContains(pattern: string | RegExp, timeout: number = 5000) {
        await expect(this.page).toHaveURL(pattern, { timeout });
        logger.info(`Verified URL contains: ${pattern}`);
    }

    async clickElement(selector: string, description: string) {
        logger.info(`Clicking on: ${description}`);
        const element = this.page.locator(selector);
        await expect(element).toBeVisible();
        await element.click();
    }

    async fillInput(selector: string, value: string, description: string) {
        logger.info(`Filling ${description} with value: ${value}`);
        const element = this.page.locator(selector);
        await expect(element).toBeVisible();
        await element.fill(value);
    }
}
