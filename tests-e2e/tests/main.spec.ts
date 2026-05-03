import { test, expect } from '../fixtures/electron.fixture';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { SallePage } from '../pages/salle.page';
import { GenererPage } from '../pages/generer.page';
import { ParameterPage } from '../pages/parameter.page';
import * as testData from '../test-data/users';
import { logger } from '../utils/logger';
import * as path from 'path';

test.describe('Main Application Flow', () => {

    test('should complete a full user journey: Auth -> Resource Mgmt -> Data Import', async ({ window }) => {
        const loginPage = new LoginPage(window);
        const dashboardPage = new DashboardPage(window);
        const sallePage = new SallePage(window);
        const genererPage = new GenererPage(window);
        
        const timestamp = Date.now();
        const user = {
            ...testData.adminUser,
            email: `admin-${timestamp}@automation.com`
        };

        // --- Phase 1: Authentication ---
        logger.step(1, 'Register a new administrator');
        await loginPage.clearSession();
        await loginPage.waitForAuthScreen();
        await loginPage.register(user.name, user.email, user.password);
        await dashboardPage.waitForDashboard();

        logger.step(2, 'Logout and verify login with new credentials');
        await dashboardPage.logout();
        await loginPage.waitForAuthScreen();
        await loginPage.login(user.email, user.password);
        await dashboardPage.waitForDashboard();

        // --- Phase 2: Resource Management ---
        logger.step(3, 'Navigate to Salles and verify prerequisites');
        await dashboardPage.navigateToSalles();
        await sallePage.waitForSallesPage();
        await sallePage.clickAjouter();

        logger.step(4, 'Quick add formateurs if needed');
        const formateurCount = await sallePage.getFormateurCount();
        if (formateurCount < 2) {
            await sallePage.quickAddFormateur('Master Trainer 1', `MT1-${timestamp}`);
            await sallePage.quickAddFormateur('Master Trainer 2', `MT2-${timestamp}`);
        }

        logger.step(5, 'Create and verify a new Salle');
        const salleLabel = `Salle-Master-${timestamp}`;
        await sallePage.addSalle(salleLabel, 1, 2);
        await sallePage.waitForSallesPage();
        await sallePage.verifySalleInList(salleLabel);

        // --- Phase 3: Data Import ---
        logger.step(6, 'Import Salles from Excel');
        const sallesFilePath = path.resolve('datatest/formateurs_avec_des_salle.xlsx');
        await sallePage.importSalles(sallesFilePath);

        logger.step(7, 'Navigate to Générer and import initial avancement data');
        await dashboardPage.navigateToGenerer();
        await genererPage.waitForGenererPage();
        const avancementFilePath = path.resolve('datatest/AvancementProgramme.xlsx');
        await genererPage.importAvancement(avancementFilePath);

        // --- Phase 4: Parameter Generation ---
        logger.step(8, 'Navigate to Parameters and generate formateur timetables');
        await dashboardPage.navigateToParameters();
        const parameterPage = new ParameterPage(window);
        await parameterPage.generateFormateurs();

        // --- Phase 5: Multi-phase Generation ---
        logger.step(9, 'Re-import updated Avancement data');
        await dashboardPage.navigateToGenerer();
        const updatedAvancementPath = path.resolve('datatest/AvancementProgramme_updated.xlsx');
        await genererPage.importAvancement(updatedAvancementPath);

        logger.step(10, 'Generate Group timetables with date offset');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const dateString = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD
        await genererPage.generateGroups(dateString);

        logger.info('Advanced E2E journey completed successfully.');
    });
});
