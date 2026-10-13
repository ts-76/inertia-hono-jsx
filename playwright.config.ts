import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4179', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node tests/browser/server.mjs', url: 'http://127.0.0.1:4179/hono', reuseExistingServer: false },
})
