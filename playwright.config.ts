import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against `npm run dev` automatically. Use checkbox reCAPTCHA mode
 * (`VITE_RECAPTCHA_SIZE=checkbox` or unset) so the anchor iframe exists.
 *
 * By default tests run headless (no browser window). To see the UI:
 *   npm run test:e2e:headed
 *   npm run test:e2e:ui
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: {} }],
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
