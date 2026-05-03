import { _electron as electron, test as base, ElectronApplication, Page } from '@playwright/test';
import { config } from '../config/env.config';
import { dbCleaner } from '../utils/db-cleaner';
import { logger } from '../utils/logger';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

async function waitForBackend(timeout = 30000) {
    const healthUrl = `http://127.0.0.1:8002/health`;
    const start = Date.now();
    logger.info(`Waiting for backend health check at ${healthUrl}...`);
    
    while (Date.now() - start < timeout) {
        try {
            const res = await fetch(healthUrl);
            if (res.ok) {
                logger.info('Backend is healthy!');
                return;
            }
        } catch (e) {
            // Silent catch for connection errors during startup
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Backend failed to become healthy at ${healthUrl} within ${timeout}ms`);
}

export const test = base.extend<ElectronFixtures>({
    electronApp: async ({}, use) => {
        logger.info('Starting Electron Application setup...');
        
        // Always clean DB before starting tests for a reproducible state
        dbCleaner.cleanDevDatabase();

        const options: any = {
            env: {
                ...process.env,
                NODE_ENV: config.testBuiltApp ? 'production' : 'development',
                IS_TEST: 'true'
            }
        };

        if (config.testBuiltApp) {
            logger.info(`Launching built Electron app from: ${config.paths.executablePath}`);
            options.executablePath = config.paths.executablePath;
            // Built app still needs these flags in many CI environments
            options.args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
            ];
        } else {
            logger.info(`Launching Electron from source with: ${config.paths.electronMain}`);
            options.args = [
                config.paths.electronMain,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-dev-shm-usage',
            ];
        }

        let app!: ElectronApplication;
        const maxLaunchAttempts = 3;
        for (let attempt = 1; attempt <= maxLaunchAttempts; attempt++) {
            try {
                app = await electron.launch(options);
                break;
            } catch (e) {
                logger.warn(`Launch attempt ${attempt}/${maxLaunchAttempts} failed: ${e}`);
                if (attempt === maxLaunchAttempts) throw e;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        logger.info('Electron app launched successfully.');

        // Pipe electron output to our logger
        app.process().stdout?.on('data', (data) => logger.info(`[ELECTRON MAIN] ${data.toString()}`));
        app.process().stderr?.on('data', (data) => {
            const msg = data.toString();
            // Filter out common non-error messages that Node/Electron send to stderr
            if (msg.includes('Debugger ending') || 
                msg.includes('Module already exists') || 
                msg.includes('skipping insert') ||
                msg.includes('Debugger listening on')) {
                logger.info(`[ELECTRON INFO] ${msg}`);
            } else {
                logger.error(`[ELECTRON ERROR] ${msg}`);
            }
        });

        await use(app);

        logger.info('Closing Electron application...');
        await app.close();
    },
    window: async ({ electronApp }, use) => {
        logger.info('Waiting for first window...');
        const window = await electronApp.firstWindow({ timeout: config.timeouts.launch });
        
        // Wait for backend to be ready before proceeding with ANY test steps
        await waitForBackend(90000);
        
        await window.waitForLoadState('domcontentloaded');
        
        // Reload the page if we are on the login screen to ensure it picks up the now-ready backend
        // (The initial load might have failed with connection refused)
        if (window.url().includes('index.html')) {
            logger.info('Reloading window to synchronize with backend...');
            await window.reload();
            await window.waitForLoadState('domcontentloaded');
        }

        // Enable console and error forwarding for better visibility
        window.on('console', (msg) => {
            const text = msg.text();
            if (msg.type() === 'error') {
                logger.error(`[BROWSER ERROR] ${text}`);
            } else {
                logger.info(`[BROWSER] ${text}`);
            }
        });
        window.on('pageerror', (err) => logger.error(`[BROWSER PAGE ERROR] ${err.message}`));
        window.on('requestfailed', (request) => {
            logger.error(`[BROWSER REQUEST FAILED] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
        });

        await use(window);
    }
});

export { expect } from '@playwright/test';
