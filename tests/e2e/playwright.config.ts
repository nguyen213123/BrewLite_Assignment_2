import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình Playwright E2E Test cho Task 4.4 (Issue #20 - TV4).
 * Chạy trên trình duyệt Chromium với Next.js + NestJS + PostgreSQL thật.
 */
export default defineConfig({
  testDir: '.',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false, // Chạy tuần tự để bảo đảm tính toàn vẹn dữ liệu đơn hàng và kho
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
