import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'docs-capture.pw.ts',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    screenshot: 'off',
    trace: 'off',
    launchOptions: {
      chromiumSandbox: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--no-zygote', '--single-process'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
