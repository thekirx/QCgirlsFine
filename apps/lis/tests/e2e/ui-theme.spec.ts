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

test("protected shell retains Optrizo branding and theme controls", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("Admin123!Quest");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/queue/);

  await expect(page.getByRole("link", { name: /Optrizo Offline LIS/ })).toBeVisible();
  await expect(page.getByText("Questcare", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Classic", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "classic");
  await page.getByRole("link", { name: "Patients" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "classic");
  await expect(page.getByRole("button", { name: "Classic", exact: true })).toHaveAttribute("aria-pressed", "true");
});
