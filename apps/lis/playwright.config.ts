import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "../../docs/test-evidence/playwright-report", open: "never" }]],
  use: { baseURL, viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  webServer: { command: `pnpm dev --port ${port}`, url: `${baseURL}/login`, reuseExistingServer: true, timeout: 120_000 },
});
