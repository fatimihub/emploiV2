import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class DashboardPage extends BasePage {
    private readonly dashboardHeader = this.page.locator('h1:has-text("Tableau de bord")');

    async waitForDashboard() {
        logger.info('Waiting for dashboard header...');
        await expect(this.dashboardHeader).toBeVisible({ timeout: 30000 });
    }

    async logout() {
        logger.info('Logging out from dashboard...');
        try {
            // Use force click from the start and wait longer
            await this.page.locator('#btn-logout').click({ force: true, timeout: 10000 });
            await this.page.waitForURL(url => !url.href.includes('dashboard'), { timeout: 10000 });
            logger.info('Logout successful via UI click.');
        } catch (e) {
            logger.warn('UI logout failed or timed out, forcing session clear and reload...');
            await this.page.evaluate(() => {
                localStorage.clear(); // Clear everything to be safe
                // Set hash to login before reload so it starts there
                window.location.hash = '#/login';
            });
            await this.page.reload();
            await this.page.waitForURL(url => url.href.includes('login'), { timeout: 15000 });
            logger.info('Logout forced via reload.');
        }
    }

    /**
     * Helper to ensure sidebar clicks are reliable
     */
    private async safeClickSidebar(selector: string, targetUrl: RegExp) {
        // Let the app settle for a moment to handle any initial dashboard load
        await this.page.waitForTimeout(1000);

        const link = this.page.locator(selector).first();
        await expect(link).toBeVisible({ timeout: 15000 });
        
        // Ensure no overlays are blocking (like success popups)
        const overlays = this.page.locator('.swal2-container, .modal-overlay, .swal2-backdrop-show, .loading-spinner');
        const count = await overlays.count();
        if (count > 0) {
            logger.info(`Detected ${count} potential blocking overlays, waiting for them to clear...`);
            await this.page.waitForTimeout(2000); // Small buffer
        }

        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
            try {
                logger.info(`Navigation attempt ${i + 1} for ${selector}...`);
                // Standard click
                await link.click({ force: true, timeout: 8000 });
                await this.verifyUrlContains(targetUrl, 10000);
                return; // Success!
            } catch (e) {
                logger.warn(`Attempt ${i + 1} (click) failed for ${selector}, trying direct hash change...`);
                const targetHash = selector.includes('salles') ? 'salles' : 
                                   selector.includes('generer') ? 'generer-emplois-du-temps' : 
                                   'parameters';
                
                await this.page.evaluate((hash) => {
                    const target = `#/administrateur/${hash}`;
                    if (window.location.hash !== target) {
                        window.location.hash = target;
                    }
                }, targetHash);

                // Give it a moment to react to hash change
                await this.page.waitForTimeout(3000);
                if (targetUrl.test(this.page.url())) {
                    logger.info(`Navigation successful via direct hash change for ${selector}`);
                    return;
                }

                // If still failing, try a reload as a last resort in the final loop
                if (i === maxRetries - 1) {
                    logger.warn(`Maximum retries reached for ${selector}, forcing reload at target hash...`);
                    await this.page.evaluate((hash) => {
                        window.location.hash = `#/administrateur/${hash}`;
                    }, targetHash);
                    await this.page.reload();
                    await this.verifyUrlContains(targetUrl, 20000);
                }
            }
        }
    }

    async navigateToSalles() {
        logger.info('Navigating to Salles page...');
        await this.safeClickSidebar('a[href*="/salles"]', /salles/);
    }

    async navigateToGenerer() {
        logger.info('Navigating to Générer des emplois page...');
        await this.safeClickSidebar('a[href*="/generer-emplois-du-temps"]', /generer-emplois-du-temps/);
    }

    async navigateToParameters() {
        logger.info('Navigating to Parameters page...');
        await this.safeClickSidebar('a[href*="/parameters"]', /parameters/);
    }
}
