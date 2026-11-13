import { defineConfig, devices } from '@playwright/test'

// E2E の設定（test.md 7.1・7.4）。ビルド成果物（vite build → vite preview）に対して実行する。
const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  // D1 のローカルファイルへの書き込みを単純に保つため、初期は直列（test.md 15章 10 で安定後に見直す）
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // migration 適用後のローカル D1（シード入り）から開始する
    command: `pnpm db:reset:local && pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
