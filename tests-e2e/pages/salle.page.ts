import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { logger } from '../utils/logger';

export class SallePage extends BasePage {
    private readonly sallesHeader = this.page.locator('h1:has-text("Salles")');
    private readonly ajouterBtn = this.page.locator('a').filter({ hasText: 'Ajouter' });
    
    // Add Salle Form
    private readonly labelInput = this.page.locator('#salle-label');
    private readonly formateur1Select = this.page.locator('select[name="formateur1"]');
    private readonly formateur2Select = this.page.locator('select[name="formateur2"]');
    private readonly submitBtn = this.page.locator('button[type="submit"]');

    // List/Search
    private readonly searchInput = this.page.locator('input[placeholder="Enter label salle..."]');

    // Quick Add Formateur Modal
    private readonly openAddFormateurBtn = this.page.locator('button[title="Ajouter un formateur"]');
    private readonly formateurNameInput = this.page.locator('input[placeholder="Ex: Jean Dupont"]');
    private readonly formateurMleInput = this.page.locator('input[placeholder="Ex: MLE123"]');
    private readonly formateurSubmitBtn = this.page.locator('button:has-text("Ajouter")').nth(1); // Second Ajouter button (in modal)
    private readonly successPopupOverlay = this.page.getByTestId('popup-success-overlay');

    async waitForSallesPage() {
        logger.info('Waiting for Salles page header...');
        await expect(this.sallesHeader).toBeVisible({ timeout: 15000 });
    }

    async clickAjouter() {
        logger.info('Clicking "Ajouter" button...');
        await this.ajouterBtn.first().click();
        await this.verifyUrlContains(/ajouter-salle/);
    }

    async quickAddFormateur(name: string, mle: string) {
        logger.info(`Quick adding Formateur: ${name} (${mle})`);
        await this.openAddFormateurBtn.first().click();
        await this.formateurNameInput.fill(name);
        await this.formateurMleInput.fill(mle);
        await this.formateurSubmitBtn.click();
        
        // Wait for modal to close (submit closes it)
        await expect(this.formateurNameInput).not.toBeVisible();
        
        // Dismiss success popup by clicking outside (overlay)
        logger.info('Dismissing success popup by clicking overlay...');
        await expect(this.successPopupOverlay).toBeVisible({ timeout: 5000 });
        await this.successPopupOverlay.click({ position: { x: 5, y: 5 } }); // Click top-left of overlay
        await expect(this.successPopupOverlay).not.toBeVisible();
        
        logger.info(`Successfully added and dismissed popup for Formateur: ${name}`);
    }

    async getFormateurCount(): Promise<number> {
        // Total options minus the "Choisissez..." placeholder
        const count = await this.formateur1Select.locator('option').count();
        return Math.max(0, count - 1);
    }

    async addSalle(label: string, f1Index: number = 1, f2Index: number = 2) {
        logger.info(`Adding new Salle: ${label} with formateur indices ${f1Index}, ${f2Index}`);
        await this.labelInput.fill(label);
        
        // Wait for formateurs to be loaded
        await this.page.waitForTimeout(500); 

        const count = await this.formateur1Select.locator('option').count();
        if (count > f1Index) {
            await this.formateur1Select.selectOption({ index: f1Index });
        }
        
        if (count > f2Index) {
            await this.formateur2Select.selectOption({ index: f2Index });
        }

        await this.submitBtn.click();
    }

    async verifySalleInList(label: string) {
        logger.info(`Verifying Salle "${label}" exists in list...`);
        await this.searchInput.fill(label);
        const row = this.page.locator(`td:has-text("${label}")`).first();
        await expect(row).toBeVisible({ timeout: 10000 });
        logger.info(`Successfully verified Salle: ${label}`);
    }

    async importSalles(filePath: string) {
        logger.info(`Importing Salles from: ${filePath}`);
        // The file input is hidden inside a label with id="file" in Salles.tsx
        const fileInput = this.page.locator('input#file');
        await fileInput.setInputFiles(filePath);
        
        // Wait for success popup
        await expect(this.successPopupOverlay).toBeVisible({ timeout: 20000 });
        
        // Success message should mention "import" or "réussie"
        const successTitle = this.page.getByTestId('popup-success-title');
        await expect(successTitle).toBeVisible();
        
        // Dismiss popup
        await this.successPopupOverlay.click({ position: { x: 5, y: 5 } });
        await expect(this.successPopupOverlay).not.toBeVisible();
        logger.info('Salles import completed successfully.');
    }
}
