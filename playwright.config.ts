import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'pnpm --filter @example/backend start',
      url: 'http://127.0.0.1:4000/graphql',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @example/frontend dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
