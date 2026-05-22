import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3075',
  },
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3075',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
