import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, fullyParallel: false,
  use: { baseURL: process.env.TEST_URL || `http://127.0.0.1:4173${process.env.TEST_PATH || '/'}`, trace: 'retain-on-failure', launchOptions: { downloadsPath: resolve('test-results/downloads') } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.TEST_URL ? undefined : { command: `"${process.execPath}" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`, url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
