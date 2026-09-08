import { expect, test } from "@playwright/test";

test("login uses Optrizo branding and persists the selected interface", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveTitle("Optrizo Offline LIS");
  await expect(page.getByText("Optrizo Offline LIS")).toBeVisible();
  await expect(page.getByText("Questcare", { exact: false })).toHaveCount(0);

  const modern = page.getByRole("button", { name: "Modern", exact: true });
  const classic = page.getByRole("button", { name: "Classic", exact: true });
  await expect(modern).toHaveAttribute("aria-pressed", "true");
  await classic.click();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "classic");
  await expect(classic).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "classic");
  await modern.click();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "modern");
});
