import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  fullyParallel: false, // Desktop apps often run better sequentially to avoid resource contention
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron is more reliable
  
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report', open: 'never' }],
    ['allure-playwright', { outputFolder: '../reports/allure-results' }],
    ['list']
  ],

  /* Web server is not needed for build-based Electron tests */


  use: {
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'Electron',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
