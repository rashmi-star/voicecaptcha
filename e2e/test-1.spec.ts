import { test, expect } from "@playwright/test";

/**
 * Recorded flow, cleaned up: actions must live inside the test callback,
 * use `page` from the fixture, and avoid dynamic iframe `name` attributes.
 */
test("open app and complete reCAPTCHA checkbox", async ({ page }) => {
  await page.goto("/demo");

  const anchorFrame = page.frameLocator('iframe[src*="api2/anchor"]');
  await anchorFrame.locator("#recaptcha-anchor").click();

  await expect(page.getByRole("button", { name: "Record" })).toBeEnabled({
    timeout: 25_000,
  });
});
