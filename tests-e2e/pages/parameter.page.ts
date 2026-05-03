import { expect } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class ParameterPage extends BasePage {
    private readonly generateFormateursBtn = this.page.getByLabel("Générer les emplois du temps des formateurs");
    private readonly successPopup = this.page.locator('[data-testid="popup-success-title"]');

    async generateFormateurs() {
        logger.info('Triggering formateur timetable generation...');
        await expect(this.generateFormateursBtn).toBeVisible();
        await this.generateFormateursBtn.click();
        
        logger.info('Waiting for success popup...');
        await expect(this.successPopup).toBeVisible({ timeout: 60000 });
        const message = await this.page.locator('.message-success').textContent();
        logger.info(`Generation result: ${message}`);
        
        // Close popup if necessary (usually they auto-close or have a close button, 
        // but for E2E we just wait for it to be visible first)
    }
}
