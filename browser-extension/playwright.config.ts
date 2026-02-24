import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  workers: 1, // Extensions usually run better single-threaded context
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
});
