/**
 * Playwright configuration for end-to-end tests
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry'
  },
  
  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium'
      }
    },
    {
      name: 'firefox',
      use: {
        browserName: 'firefox'
      }
    },
    {
      name: 'webkit',
      use: {
        browserName: 'webkit'
      }
    }
  ],
  
  // Run local development server before starting the tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe'
  }
}); 