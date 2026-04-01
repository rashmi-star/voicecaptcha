/**
 * Research / local demo only
 * -------------------------
 * Shows that Playwright can automate the *browser UI* of a traditional
 * reCAPTCHA v2 checkbox on a page you control (localhost).
 *
 * Important limitations:
 * - Google’s **test** site key always accepts the challenge; it does not
 *   reflect production risk scoring, IP reputation, or advanced bot checks.
 * - Production reCAPTCHA may show harder challenges, block headless browsers,
 *   or fail server-side token checks — this test does not “break Google.”
 * - Do not point this at sites you do not own or have permission to test.
 */
import { test, expect } from "@playwright/test";

test.describe("Playwright drives reCAPTCHA checkbox (local app)", () => {
  test("automation can click the widget and enable Record", async ({ page }) => {
    await page.goto("/demo");

    const record = page.getByRole("button", { name: "Record" });
    await expect(record).toBeDisabled();

    const anchorIframe = page.locator('iframe[src*="api2/anchor"]');
    await expect(anchorIframe).toBeVisible({ timeout: 15_000 });

    const frame = page.frameLocator('iframe[src*="api2/anchor"]');
    await frame.locator("#recaptcha-anchor").click();

    await expect(record).toBeEnabled({ timeout: 25_000 });
  });
});
