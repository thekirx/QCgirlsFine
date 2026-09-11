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

test("Classic applies the approved restrained desktop visual contract", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Classic", exact: true }).click();

  const card = page.locator(".login-card");
  await expect(card).toHaveCSS("border-radius", "0px");
  await expect(card).toHaveCSS("font-family", /Tahoma/);
  await expect(card).toHaveCSS("background-color", "rgb(242, 242, 242)");

  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("Admin123!Quest");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/queue/);

  await expect(page.locator(".metric-row > div").first()).toHaveCSS("border-radius", "0px");
  await expect(page.locator(".table-card")).toHaveCSS("border-radius", "0px");
  await expect(page.getByText("Retro", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Option A", { exact: false })).toHaveCount(0);
});

test("Windows 98 persists and presents the protected shell as a desktop window", async ({ page }) => {
  await page.goto("/login");

  const windows98 = page.getByRole("button", { name: "Windows 98", exact: true });
  await windows98.click();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "windows98");
  await expect(windows98).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ui-theme", "windows98");

  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("Admin123!Quest");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/queue/);

  await expect(page.getByText("Optrizo LIS - Workstation", { exact: true })).toBeVisible();
  await expect(page.locator(".win98-menubar")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Application menu" })).toHaveCount(0);
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 128, 128)");
  await expect(page.locator(".workspace")).toHaveCSS("background-color", "rgb(192, 192, 192)");
  await expect(page.locator(".win98-titlebar")).toHaveCSS("background-color", "rgb(0, 0, 128)");

  await page.getByRole("button", { name: "Modern", exact: true }).click();
  await expect(page.locator(".win98-titlebar")).toBeHidden();
});

test("Windows 98 keeps sign out accessible on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Windows 98", exact: true }).click();
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("Admin123!Quest");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/queue/);

  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
});

test("Windows 98 keeps analyzer connection states readable", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Windows 98", exact: true }).click();
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("Admin123!Quest");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/queue/);
  await page.goto("/analyzers");

  await expect(page.locator(".connection.online").first()).toHaveCSS("color", "rgb(0, 80, 0)");
});
