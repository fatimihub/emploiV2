import { expect, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class LoginPage extends BasePage {
    private readonly loadingIndicator = this.page.locator('[data-testid="auth-loading"]');
    private readonly registerBtn = this.page.locator('text=Register').first();
    private readonly loginHeader = this.page.locator('h2:has-text("Login")').first();
    
    // Registration Fields
    private readonly regNameInput = this.page.locator('input[name="name"]');
    private readonly regEmailInput = this.page.locator('input[name="email"]');
    private readonly regPassInput = this.page.locator('input[name="password"]');
    private readonly regConfirmPassInput = this.page.locator('input[name="passwordConfirmation"]');
    private readonly submitRegisterBtn = this.page.locator('button:has-text("Register")');

    // Login Fields
    private readonly loginEmailInput = this.page.locator('input[type="email"]');
    private readonly loginPassInput = this.page.locator('input[type="password"]');
    private readonly submitLoginBtn = this.page.locator('button:has-text("Login")');

    async clearSession() {
        logger.info('Clearing stale session...');
        const url = this.page.url();
        if (url !== 'about:blank' && url !== '') {
            try {
                await this.page.evaluate(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('administrator');
                });
                await this.page.reload();
            } catch (e) {
                logger.debug('Failed to clear sessions or reload, skipping...');
            }
        } else {
            logger.info('Page is on about:blank, skipping reload.');
        }
        await this.waitForPageToLoad();
    }

    async waitForAuthScreen() {
        logger.info('Waiting for authentication screen to settle...');
        
        // If we are still on the dashboard, it means a logout failed or redirect is stuck
        const initialUrl = this.page.url();
        if (initialUrl.includes('dashboard')) {
            logger.warn('Still on dashboard during waitForAuthScreen, forcing session clear...');
            await this.clearSession();
        }

        try {
            await expect(this.loadingIndicator).not.toBeVisible({ timeout: 60000 });
        } catch (e) {
            const url = this.page.url();
            logger.error(`Loading indicator still visible after 60s. URL: ${url}`);
            throw e;
        }
        
        await expect(async () => {
            const hasRegister = await this.registerBtn.isVisible();
            const hasLogin = await this.loginHeader.isVisible();
            
            if (!hasRegister && !hasLogin) {
                const url = this.page.url();
                const content = await this.page.content();
                
                // If we are at /login but nothing is showing, try a reload
                if (url.includes('/login') && content.length < 1000) {
                    logger.warn('At login URL but content seems empty. Forcing reload...');
                    await this.page.reload();
                    await this.page.waitForTimeout(2000);
                } else if (url.includes('dashboard')) {
                    logger.warn('Still on dashboard URL in login wait loop. Clearing session...');
                    await this.clearSession();
                }

                throw new Error(`Neither Login nor Register screen visible. URL: ${url}`);
            }
        }).toPass({ timeout: 45000, intervals: [1000, 2000, 5000] });
    }

    async isRegisterAvailable(): Promise<boolean> {
        return this.registerBtn.isVisible();
    }

    async register(name: string, email: string, pass: string) {
        logger.info(`Performing registration for: ${email}`);
        await this.registerBtn.click();
        await this.regNameInput.fill(name);
        await this.regEmailInput.fill(email);
        await this.regPassInput.fill(pass);
        await this.regConfirmPassInput.fill(pass);
        await this.submitRegisterBtn.click();
    }

    async login(email: string, pass: string) {
        logger.info(`Performing login for: ${email}`);
        await this.loginEmailInput.fill(email);
        await this.loginPassInput.fill(pass);
        await this.submitLoginBtn.click();
    }
}
