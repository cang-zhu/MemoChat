const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['junit', { outputFile: '../reports/junit/playwright-results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:6000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.electron\.spec\.js/
    }
  ],
  webServer: {
    command: 'cd ../.. && python src/backend/server.py',
    port: 6000,
    reuseExistingServer: !process.env.CI
  }
});