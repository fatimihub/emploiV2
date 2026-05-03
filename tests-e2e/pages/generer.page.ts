import { expect } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class GenererPage extends BasePage {
    private readonly dateInput = this.page.locator('#input-valid-a-partir');
    private readonly importInput = this.page.locator('#importData');
    private readonly generateBtn = this.page.getByTitle('generate-emplois-du-temps-des-groupes');
    private readonly successPopup = this.page.locator('[data-testid="popup-success-title"]');
    private readonly pageHeader = this.page.locator('h1:has-text("Générate des emplois du temps")');

    async waitForGenererPage() {
        logger.info('Waiting for Générer page header...');
        await expect(this.pageHeader).toBeVisible({ timeout: 30000 });
    }

    async importAvancement(filePath: string) {
        logger.info(`Importing Avancement data from: ${filePath}`);
        await this.importInput.setInputFiles(filePath);
        await expect(this.successPopup).toBeVisible({ timeout: 60000 });
        
        const message = await this.page.locator('.message-success').textContent();
        logger.info(`Import result: ${message}`);
        
        // Close popup by clicking outside
        await this.page.getByTestId('popup-success-overlay').click({ position: { x: 10, y: 10 } }); 
        await expect(this.successPopup).not.toBeVisible();
    }

    async generateGroups(date: string) {
        logger.info(`Generating group timetables for date: ${date}`);
        await this.dateInput.fill(date);
        await this.generateBtn.click();
        
        logger.info('Waiting for generation success popup...');
        await expect(this.successPopup).toBeVisible({ timeout: 300000 }); // Generation can be slow
        
        const message = await this.page.locator('.message-success').textContent();
        logger.info(`Group generation result: ${message}`);
        
        if (message?.includes('Modules désactivés')) {
            logger.warn('Warning: Some modules were deactivated during generation.');
        } else {
            logger.info('Success: All modules scheduled without conflicts.');
        }
        
        // Close popup by clicking outside (handle auto-dismiss gracefully)
        const overlay = this.page.getByTestId('popup-success-overlay');
        try {
            await overlay.click({ position: { x: 10, y: 10 }, timeout: 5000 });
        } catch {
            logger.info('Popup overlay already dismissed or not found, continuing...');
        }
        await expect(this.successPopup).not.toBeVisible({ timeout: 5000 });
    }
}
