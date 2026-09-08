# Optrizo Classic Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the LIS frontend as Optrizo, add a persistent Modern/Classic presentation switch matching the approved softened Option A direction, and host the unchanged LIS in a secure Electron desktop shell.

**Architecture:** The existing Next.js application remains the single renderer and owns all workflows. A client provider stores `modern|classic` locally and applies it to `document.documentElement.dataset.uiTheme`; CSS overrides render the Classic presentation without branching page logic. Electron is a thin, context-isolated host that loads the local LIS URL and exposes only a narrow environment query through preload IPC.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, TypeScript 5.9.3, CSS, Playwright 1.62.0, Electron 44.2.0, Node.js built-in test runner, pnpm 11.9.0.

**Spec:** `docs/superpowers/specs/2026-09-09-optrizo-classic-desktop-design.md`

## Global Constraints

- Visible product branding is `Optrizo`; do not change domain values such as `QC` accession and patient identifiers.
- User-facing theme labels are exactly `Modern` and `Classic`; never display `Retro`, `Soft Retro`, `Old-School`, `Windows 95`, `Windows 98`, or `Option A`.
- The Classic presentation uses cool gray surfaces, muted navy accents, compact Tahoma-like typography, square controls, thin outlines, and restrained one-pixel raised/inset edges.
- Do not change Prisma, migrations, APIs, authentication/session behavior, analyzer behavior, report rendering, database data, or backend service code.
- Keep one shared page structure and one set of workflows; theme changes are CSS/presentation only.
- Electron must use `contextIsolation: true`, `nodeIntegration: false`, and a preload bridge with no unrestricted Node.js exposure.
- The default theme is `modern`, and the selected theme must survive reloads and Electron restarts through renderer local storage.
- Development Electron expects the LIS server to run separately; installers, packaging, auto-update, and service orchestration are out of scope.

---

## File Structure

```text
apps/
├── desktop/
│   ├── main.js                         # Electron lifecycle, window, navigation policy, IPC
│   ├── preload.js                      # Narrow contextBridge API
│   ├── window-options.js               # Pure, testable BrowserWindow configuration
│   ├── package.json                    # Electron scripts and dependency
│   └── test/
│       └── window-options.test.js      # Security and URL-policy tests
└── lis/
    ├── playwright.config.ts            # Selectable isolated E2E port
    ├── src/app/
    │   ├── ui-theme-provider.tsx       # Theme state, DOM attribute, persistence
    │   ├── ui-theme-toggle.tsx         # Accessible Modern/Classic control
    │   ├── layout.tsx                  # Optrizo metadata, pre-hydration theme restore
    │   ├── login/page.tsx              # Persistent toggle on login
    │   ├── login/login-form.tsx        # Visible Optrizo login branding
    │   ├── (protected)/layout.tsx      # Optrizo sidebar and toggle in top bar
    │   └── globals.css                 # Toggle styling and Classic theme layer
    └── tests/e2e/
        └── ui-theme.spec.ts            # Branding, switching, persistence, visual rules
package.json                            # Desktop convenience scripts
```

### Task 1: Login Branding and Persistent Theme Foundation

**Files:**
- Create: `apps/lis/tests/e2e/ui-theme.spec.ts`
- Create: `apps/lis/src/app/ui-theme-provider.tsx`
- Create: `apps/lis/src/app/ui-theme-toggle.tsx`
- Modify: `apps/lis/playwright.config.ts:1-2`
- Modify: `apps/lis/src/app/layout.tsx:1-33`
- Modify: `apps/lis/src/app/login/page.tsx:1-5`
- Modify: `apps/lis/src/app/login/login-form.tsx:15-22`

**Interfaces:**
- Produces: `type UITheme = "modern" | "classic"`.
- Produces: `UIThemeProvider({ children }: { children: ReactNode })`.
- Produces: `useUITheme(): { theme: UITheme; selectTheme(theme: UITheme): void }`.
- Produces: `UIThemeToggle()` with buttons named `Modern` and `Classic` and accurate `aria-pressed` state.
- Persists: local-storage key `optrizo-ui-theme` with value `modern|classic`.

- [ ] **Step 1: Make Playwright use an isolated configurable port**

Replace `apps/lis/playwright.config.ts` with:

```ts
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
  webServer: { command: `pnpm dev -- --port ${port}`, url: `${baseURL}/login`, reuseExistingServer: true, timeout: 120_000 },
});
```

- [ ] **Step 2: Write the failing login branding and theme-persistence test**

Create `apps/lis/tests/e2e/ui-theme.spec.ts`:

```ts
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
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @questcare/lis exec playwright test tests/e2e/ui-theme.spec.ts
```

Expected: FAIL because the title is still `Questcare Offline LIS` and the Modern/Classic buttons do not exist.

- [ ] **Step 4: Implement theme state and persistence**

Create `apps/lis/src/app/ui-theme-provider.tsx`:

```tsx
"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type UITheme = "modern" | "classic";
export const UI_THEME_STORAGE_KEY = "optrizo-ui-theme";

type UIThemeContextValue = {
  theme: UITheme;
  selectTheme: (theme: UITheme) => void;
};

const UIThemeContext = createContext<UIThemeContextValue | null>(null);

function isUITheme(value: string | undefined): value is UITheme {
  return value === "modern" || value === "classic";
}

export function UIThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<UITheme>("modern");

  useEffect(() => {
    const restored = document.documentElement.dataset.uiTheme;
    if (isUITheme(restored)) setTheme(restored);
  }, []);

  const selectTheme = useCallback((nextTheme: UITheme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.uiTheme = nextTheme;
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, selectTheme }), [theme, selectTheme]);
  return <UIThemeContext.Provider value={value}>{children}</UIThemeContext.Provider>;
}

export function useUITheme() {
  const context = useContext(UIThemeContext);
  if (!context) throw new Error("useUITheme must be used within UIThemeProvider");
  return context;
}
```

- [ ] **Step 5: Implement the accessible switch**

Create `apps/lis/src/app/ui-theme-toggle.tsx`:

```tsx
"use client";

import { useUITheme, type UITheme } from "./ui-theme-provider";

const themes: Array<{ value: UITheme; label: string }> = [
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
];

export function UIThemeToggle() {
  const { theme, selectTheme } = useUITheme();
  return (
    <div className="ui-theme-toggle" role="group" aria-label="Interface style">
      {themes.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={theme === value} onClick={() => selectTheme(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Restore the theme before hydration and install the provider**

In `apps/lis/src/app/layout.tsx`, import `UIThemeProvider`, change metadata title to `Optrizo Offline LIS`, add `data-ui-theme="modern"` and `suppressHydrationWarning` to `<html>`, and place this script inside `<head>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem("optrizo-ui-theme");document.documentElement.dataset.uiTheme=t==="classic"?"classic":"modern";}catch(e){document.documentElement.dataset.uiTheme="modern";}})();`,
  }}
/>
```

Wrap the body content without changing page behavior:

```tsx
<body className="min-h-full flex flex-col">
  <UIThemeProvider>{children}</UIThemeProvider>
</body>
```

- [ ] **Step 7: Add the login switch and Optrizo copy**

In `apps/lis/src/app/login/page.tsx`, import `UIThemeToggle` and render it first inside `.login-shell`:

```tsx
<div className="login-theme-switch"><UIThemeToggle /></div>
```

In `apps/lis/src/app/login/login-form.tsx`, replace the visible brand row with:

```tsx
<div className="brand-mark"><ShieldCheck size={22} /> O</div>
<p className="eyebrow">Optrizo Offline LIS</p>
```

Do not change the demo password string `Admin123!Quest`; it is authentication data, not visible product branding.

- [ ] **Step 8: Add base toggle styling**

Append to the modern section of `apps/lis/src/app/globals.css`:

```css
.login-theme-switch{position:fixed;top:20px;right:20px;z-index:10}
.ui-theme-toggle{display:inline-flex;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--card);box-shadow:0 8px 24px rgba(20,48,44,.08)}
.ui-theme-toggle button{min-width:82px;border:0;border-radius:7px;padding:8px 12px;background:transparent;color:var(--muted);font-size:12px;font-weight:750;cursor:pointer}
.ui-theme-toggle button[aria-pressed="true"]{background:var(--teal);color:white}
.ui-theme-toggle button:focus-visible{outline:2px solid var(--orange);outline-offset:2px}
```

- [ ] **Step 9: Run the focused test and verify GREEN**

Run the same Playwright command. Expected: PASS with Optrizo branding, correct pressed states, instant DOM theme changes, and persisted Classic state after reload.

- [ ] **Step 10: Commit the theme foundation**

```bash
git add apps/lis/playwright.config.ts apps/lis/tests/e2e/ui-theme.spec.ts apps/lis/src/app/ui-theme-provider.tsx apps/lis/src/app/ui-theme-toggle.tsx apps/lis/src/app/layout.tsx apps/lis/src/app/login/page.tsx apps/lis/src/app/login/login-form.tsx apps/lis/src/app/globals.css
git commit -m "feat: add Optrizo interface theme switch"
```

### Task 2: Protected-Shell Branding and Persistent Access

**Files:**
- Modify: `apps/lis/tests/e2e/ui-theme.spec.ts`
- Modify: `apps/lis/src/app/(protected)/layout.tsx:1-16`
- Modify: `apps/lis/src/app/globals.css`

**Interfaces:**
- Consumes: `UIThemeToggle()` from Task 1.
- Produces: protected navigation brand `Optrizo` with monogram `O`.
- Produces: `.topbar-actions` containing the date and the persistent theme switch.

- [ ] **Step 1: Write the failing protected-shell test**

Append to `apps/lis/tests/e2e/ui-theme.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
pnpm --filter @questcare/lis exec playwright test tests/e2e/ui-theme.spec.ts --grep "protected shell"
```

Expected: FAIL because the protected sidebar still reads `Questcare` and has no theme switch.

- [ ] **Step 3: Rebrand and mount the switch in the protected layout**

In `apps/lis/src/app/(protected)/layout.tsx`:

```tsx
import { UIThemeToggle } from "@/app/ui-theme-toggle";
```

Replace the brand content with:

```tsx
<Link href="/queue" className="side-brand">
  <span>O</span><div>Optrizo<small>Offline LIS</small></div>
</Link>
```

Replace the topbar with:

```tsx
<header className="topbar">
  <div><span className="status-dot" /> Local server online</div>
  <div className="topbar-actions">
    <span>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date())}</span>
    <UIThemeToggle />
  </div>
</header>
```

- [ ] **Step 4: Add protected-topbar alignment styles**

Append to `apps/lis/src/app/globals.css`:

```css
.topbar-actions{display:flex;align-items:center;gap:18px}
@media(max-width:800px){.topbar-actions>span{display:none}.topbar .ui-theme-toggle button{min-width:64px;padding-inline:8px}}
```

- [ ] **Step 5: Run the full theme spec and verify GREEN**

Run the whole `ui-theme.spec.ts`. Expected: both tests PASS and the selection remains Classic while navigating from Work Queue to Patients.

- [ ] **Step 6: Commit the protected shell**

```bash
git add apps/lis/tests/e2e/ui-theme.spec.ts 'apps/lis/src/app/(protected)/layout.tsx' apps/lis/src/app/globals.css
git commit -m "feat: rebrand the LIS shell as Optrizo"
```

### Task 3: Approved Soft-Classic Presentation

**Files:**
- Modify: `apps/lis/tests/e2e/ui-theme.spec.ts`
- Modify: `apps/lis/src/app/globals.css`
- Modify: `apps/lis/src/app/analyzer.css` only if a selector cannot be overridden cleanly from `globals.css`

**Interfaces:**
- Consumes: root attribute `html[data-ui-theme="classic"]` from Task 1.
- Produces: CSS variables and overrides scoped entirely beneath `[data-ui-theme="classic"]`.
- Does not alter: page markup, route behavior, fetches, form actions, or domain values.

- [ ] **Step 1: Write the failing visual-contract test**

Append to `apps/lis/tests/e2e/ui-theme.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the visual-contract test and verify RED**

Run:

```bash
pnpm --filter @questcare/lis exec playwright test tests/e2e/ui-theme.spec.ts --grep "visual contract"
```

Expected: FAIL because the current cards use large rounded corners, Arial, white card surfaces, gradients, and modern pill badges.

- [ ] **Step 3: Add the Classic palette and global geometry**

Append this scoped layer to `apps/lis/src/app/globals.css`:

```css
html[data-ui-theme="classic"]{
  --ink:#152238;--muted:#4e5d70;--line:#7f91a7;--paper:#d9dce0;--card:#f2f2f2;
  --teal:#123f78;--teal-dark:#0c2e59;--mint:#d6e0eb;--orange:#a64f24;
  --shadow:inset 1px 1px #fff,inset -1px -1px #8b929a;
}
html[data-ui-theme="classic"] body{background:var(--paper);font-family:Tahoma,"MS Sans Serif",Arial,sans-serif}
html[data-ui-theme="classic"] input,
html[data-ui-theme="classic"] select,
html[data-ui-theme="classic"] textarea{border:1px solid #66758a;border-radius:0;background:#fff;box-shadow:inset 1px 1px #8d949c,inset -1px -1px #fff}
html[data-ui-theme="classic"] input:focus,
html[data-ui-theme="classic"] select:focus,
html[data-ui-theme="classic"] textarea:focus{border-color:#123f78;box-shadow:inset 1px 1px #66758a,inset -1px -1px #fff;outline:1px dotted #123f78;outline-offset:2px}
html[data-ui-theme="classic"] .login-card,
html[data-ui-theme="classic"] .metric-row>div,
html[data-ui-theme="classic"] .table-card,
html[data-ui-theme="classic"] .panel,
html[data-ui-theme="classic"] .empty-state,
html[data-ui-theme="classic"] .analyzer-strip article{border:1px solid #7f91a7;border-radius:0;background:#f2f2f2;box-shadow:var(--shadow)}
```

- [ ] **Step 4: Style the Classic login experience**

Add scoped rules that remove gradients and soften the nostalgic treatment:

```css
html[data-ui-theme="classic"] .login-shell{background:#d9dce0}
html[data-ui-theme="classic"] .login-intro{background:#cbd2db;border-right:1px solid #7f91a7}
html[data-ui-theme="classic"] .login-intro h2{font-size:clamp(38px,5vw,64px);letter-spacing:-.035em}
html[data-ui-theme="classic"] .login-card{padding:36px}
html[data-ui-theme="classic"] .brand-mark{letter-spacing:.02em;color:#123f78}
html[data-ui-theme="classic"] .primary-button,
html[data-ui-theme="classic"] .link-button,
html[data-ui-theme="classic"] .search-row button,
html[data-ui-theme="classic"] .small-button{border:1px solid #66758a;border-radius:0;background:#e5e7e9;color:#152238;box-shadow:1px 1px #fff,-1px -1px #808891}
html[data-ui-theme="classic"] .primary-button:hover,
html[data-ui-theme="classic"] .link-button:hover{background:#d7dce2}
html[data-ui-theme="classic"] .primary-button:active,
html[data-ui-theme="classic"] .link-button:active{box-shadow:inset 1px 1px #808891,inset -1px -1px #fff}
```

- [ ] **Step 5: Style the Classic application shell and data surfaces**

Add scoped rules for the approved Option A hierarchy without adding any nostalgic labels:

```css
html[data-ui-theme="classic"] .sidebar{background:#e1e3e6;color:#152238;border-right:1px solid #6f7e91}
html[data-ui-theme="classic"] .side-brand{color:#123f78}
html[data-ui-theme="classic"] .side-brand>span{border-radius:0;background:#123f78;color:white;box-shadow:1px 1px #fff,-1px -1px #75808c}
html[data-ui-theme="classic"] .side-brand small,
html[data-ui-theme="classic"] .side-user small{color:#596879}
html[data-ui-theme="classic"] .sidebar nav a{color:#18355d;border:1px solid transparent;border-radius:0}
html[data-ui-theme="classic"] .sidebar nav a:hover{background:#cbd3dd;color:#102f5b;border-color:#8593a5;box-shadow:inset 1px 1px #fff,inset -1px -1px #8c949d}
html[data-ui-theme="classic"] .side-user{border-top-color:#8995a4}
html[data-ui-theme="classic"] .logout-button{color:#33465f}
html[data-ui-theme="classic"] .topbar{background:#e8e9eb;border-bottom-color:#7f91a7}
html[data-ui-theme="classic"] .page-heading h1{letter-spacing:-.025em}
html[data-ui-theme="classic"] .table-card th{background:#cbd3dd;color:#243b58;border-right:1px solid #9aa5b2}
html[data-ui-theme="classic"] .table-card td{border-color:#9aa5b2}
html[data-ui-theme="classic"] .badge{border-radius:0;border:1px solid #a1abb5}
html[data-ui-theme="classic"] .icon-link,
html[data-ui-theme="classic"] .avatar,
html[data-ui-theme="classic"] .analyzer-icon,
html[data-ui-theme="classic"] .test-picker label,
html[data-ui-theme="classic"] .patient-picker button,
html[data-ui-theme="classic"] .notice,
html[data-ui-theme="classic"] .clean-state,
html[data-ui-theme="classic"] .action-bar{border-radius:0}
html[data-ui-theme="classic"] .action-bar{background:#e9eaec;box-shadow:inset 1px 1px #fff,inset -1px -1px #8b929a}
```

- [ ] **Step 6: Restyle the toggle itself for Classic mode**

```css
html[data-ui-theme="classic"] .ui-theme-toggle{padding:2px;border-color:#66758a;border-radius:0;background:#dfe2e5;box-shadow:inset 1px 1px #fff,inset -1px -1px #858d96}
html[data-ui-theme="classic"] .ui-theme-toggle button{border-radius:0;color:#243b58}
html[data-ui-theme="classic"] .ui-theme-toggle button[aria-pressed="true"]{background:#123f78;color:#fff;box-shadow:inset 1px 1px #0b294d,inset -1px -1px #567aa4}
```

- [ ] **Step 7: Run the visual-contract and existing workflow tests**

Run:

```bash
pnpm --filter @questcare/lis exec playwright test tests/e2e/ui-theme.spec.ts
pnpm --filter @questcare/lis exec playwright test tests/e2e/mvp-workflow.spec.ts
```

Expected: all tests PASS. The complete workflow must remain unchanged because the theme layer changes presentation only.

- [ ] **Step 8: Commit the Classic presentation**

```bash
git add apps/lis/tests/e2e/ui-theme.spec.ts apps/lis/src/app/globals.css apps/lis/src/app/analyzer.css
git commit -m "feat: add Optrizo Classic presentation"
```

### Task 4: Secure Electron Desktop Host

**Files:**
- Create: `apps/desktop/test/window-options.test.js`
- Create: `apps/desktop/window-options.js`
- Create: `apps/desktop/preload.js`
- Create: `apps/desktop/main.js`
- Create: `apps/desktop/package.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` through `pnpm install`

**Interfaces:**
- Produces: `createWindowOptions(preloadPath): Electron.BrowserWindowConstructorOptions` as a pure CommonJS factory.
- Produces: `isAllowedExternalUrl(value): boolean`, accepting only `https:` and `http:` URLs.
- Produces renderer bridge: `window.optrizoDesktop.getEnvironment(): Promise<{ isElectron: true; platform: string }>`.
- IPC channel: `desktop:get-environment`.
- Environment input: `OPTRIZO_LIS_URL`, defaulting to `http://127.0.0.1:3000`.

- [ ] **Step 1: Write the failing Electron security test**

Create `apps/desktop/test/window-options.test.js`:

```js
const assert = require("node:assert/strict");
const test = require("node:test");
const { createWindowOptions, isAllowedExternalUrl } = require("../window-options");

test("desktop window isolates renderer content", () => {
  const options = createWindowOptions("/tmp/preload.js");
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.preload, "/tmp/preload.js");
  assert.equal(options.minWidth, 1024);
  assert.equal(options.minHeight, 700);
});

test("external navigation allows only HTTP and HTTPS", () => {
  assert.equal(isAllowedExternalUrl("https://optrizo.com"), true);
  assert.equal(isAllowedExternalUrl("http://127.0.0.1:3000"), true);
  assert.equal(isAllowedExternalUrl("file:///etc/passwd"), false);
  assert.equal(isAllowedExternalUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedExternalUrl("not a url"), false);
});
```

- [ ] **Step 2: Run the desktop test and verify RED**

Run:

```bash
node --test apps/desktop/test/window-options.test.js
```

Expected: FAIL with `Cannot find module '../window-options'`.

- [ ] **Step 3: Implement the pure window policy**

Create `apps/desktop/window-options.js`:

```js
function createWindowOptions(preloadPath) {
  return {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#d9dce0",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

function isAllowedExternalUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

module.exports = { createWindowOptions, isAllowedExternalUrl };
```

- [ ] **Step 4: Run the desktop test and verify GREEN**

Run the same `node --test` command. Expected: 2 tests PASS.

- [ ] **Step 5: Implement the preload bridge**

Create `apps/desktop/preload.js`:

```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("optrizoDesktop", {
  getEnvironment: () => ipcRenderer.invoke("desktop:get-environment"),
});
```

- [ ] **Step 6: Implement the Electron main process**

Create `apps/desktop/main.js`:

```js
const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { createWindowOptions, isAllowedExternalUrl } = require("./window-options");

const lisUrl = process.env.OPTRIZO_LIS_URL ?? "http://127.0.0.1:3000";

function createWindow() {
  const window = new BrowserWindow(createWindowOptions(path.join(__dirname, "preload.js")));
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== new URL(lisUrl).origin) event.preventDefault();
  });
  window.once("ready-to-show", () => window.show());
  void window.loadURL(lisUrl);
}

app.whenReady().then(() => {
  ipcMain.handle("desktop:get-environment", () => ({ isElectron: true, platform: process.platform }));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 7: Add the desktop package and root commands**

Create `apps/desktop/package.json`:

```json
{
  "name": "@optrizo/desktop",
  "version": "0.1.0",
  "private": true,
  "main": "main.js",
  "scripts": {
    "dev": "electron .",
    "test": "node --test test/*.test.js",
    "lint": "node --check main.js && node --check preload.js && node --check window-options.js",
    "typecheck": "node --check main.js && node --check preload.js && node --check window-options.js",
    "build": "node --check main.js && node --check preload.js && node --check window-options.js"
  },
  "devDependencies": {
    "electron": "44.2.0"
  }
}
```

Add these scripts to the root `package.json` without changing existing commands:

```json
"dev:desktop": "pnpm --filter @optrizo/desktop dev",
"test:desktop": "pnpm --filter @optrizo/desktop test"
```

- [ ] **Step 8: Install the pinned Electron dependency**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` records Electron 44.2.0 and installation finishes successfully.

- [ ] **Step 9: Verify syntax and desktop security tests**

Run:

```bash
pnpm --filter @optrizo/desktop lint
pnpm --filter @optrizo/desktop test
```

Expected: syntax checks exit 0 and both security tests PASS.

- [ ] **Step 10: Smoke-test the Electron host with the LIS running**

Start the LIS in one terminal:

```bash
pnpm --filter @questcare/lis dev -- --port 3100
```

Start Electron in another terminal:

```bash
OPTRIZO_LIS_URL=http://127.0.0.1:3100 pnpm dev:desktop
```

Expected: an Electron window opens Optrizo, the Modern/Classic switch works without reloading, Classic survives closing and reopening Electron, and no Node.js globals are exposed in renderer content.

- [ ] **Step 11: Commit the Electron host**

```bash
git add apps/desktop package.json pnpm-lock.yaml
git commit -m "feat: add secure Optrizo Electron host"
```

### Task 5: Full Regression and Visual Verification

**Files:**
- Modify only files required to correct failures attributable to Tasks 1-4.
- Do not commit generated Playwright HTML reports or screenshots unless explicitly requested.

**Interfaces:**
- Verifies all acceptance criteria from the approved spec.
- Produces no new runtime API.

- [ ] **Step 1: Run static validation**

```bash
pnpm lint
pnpm typecheck
```

Expected: all workspace packages exit 0 with no errors.

- [ ] **Step 2: Run automated tests**

```bash
pnpm test
pnpm --filter @questcare/lis exec playwright test tests/e2e/ui-theme.spec.ts
pnpm --filter @questcare/lis exec playwright test tests/e2e/mvp-workflow.spec.ts
```

Expected: all unit, integration, theme, and complete clinical workflow tests PASS.

- [ ] **Step 3: Build all workspace packages**

```bash
pnpm build
```

Expected: Next.js production build and Electron syntax build exit 0.

- [ ] **Step 4: Perform rendered desktop and mobile checks**

Use Playwright or the available Browser tooling at `1440x900` and `390x844`. Verify:

```text
Login -> Optrizo branding -> Classic -> reload -> Classic retained
Classic login -> sign in -> Work Queue -> Patients -> Analyzers -> theme control remains available
Protected shell -> Modern -> current modern visual presentation restored
Both themes -> no clipping, overlap, unreadable labels, broken focus states, or framework overlay
Console -> no application errors or relevant warnings
Visible copy -> no Questcare branding and no Retro/Option A wording
Domain data -> QC accession and patient identifiers remain unchanged
```

- [ ] **Step 5: Capture comparison evidence outside the repository**

Capture one Modern and one Classic work-queue screenshot plus one Classic mobile login screenshot to a temporary external location such as `/tmp/optrizo-ui-evidence/`. Compare the Classic desktop screenshot against the approved Option A mock for palette, square geometry, density, and restrained bevel depth.

- [ ] **Step 6: Run the Electron smoke check once more**

Launch the LIS and Electron using the commands in Task 4. Confirm the window loads, the toggle responds, the selected theme survives an Electron restart, unexpected child windows are denied, and normal same-origin LIS navigation works.

- [ ] **Step 7: Inspect the final diff for scope**

```bash
git status --short
git diff --stat HEAD~4..HEAD
git diff --name-only HEAD~4..HEAD
```

Expected: only the approved frontend, test configuration, Electron shell, lockfile, spec, and plan files appear. No Prisma, API, auth, analyzer-service, report-renderer, or database files appear.

- [ ] **Step 8: Commit any verification-only corrections**

If verification required corrections, stage only those files and commit them with:

```bash
git commit -m "fix: complete Optrizo desktop verification"
```

If no correction was required, do not create an empty commit.
