# Optrizo Classic Desktop Design

## Objective

Package the existing laboratory information system in an Electron desktop shell and let users switch instantly between its existing modern presentation and a cleaner classic desktop presentation based on Option A. The classic presentation keeps restrained late-1990s visual cues without naming or marketing itself as retro.

## Approved Visual Direction

The classic view uses a cool gray workspace, muted navy accents, compact Tahoma-like typography, square controls, thin outlines, and subtle one-pixel inset or raised edges. It keeps the current information hierarchy and generous alignment while removing the heavy operating-system chrome, menu bar, fake window controls, oversized bevels, and large decorative empty panels from the first mock.

Visible product branding changes from `Questcare` to `Optrizo`. The switch is labeled `Modern` and `Classic`; no visible copy may include `Retro`, `Soft Retro`, `Old-School`, `Windows 95`, `Windows 98`, or `Option A`.

## Application Architecture

The existing Next.js LIS remains the only application UI and source of workflow behavior. Electron is a thin desktop host that opens the locally running LIS and does not duplicate pages, data access, authentication, or clinical logic.

The renderer uses one shared DOM and two CSS presentations. A root `data-ui-theme="modern|classic"` attribute selects the active presentation. A small client-side theme control changes that attribute instantly and persists the choice in local storage. The control appears on login and protected pages so the selected presentation is always reachable.

Electron uses a minimal main process and context-isolated preload script. The renderer receives no Node.js access. Theme switching is renderer-local and does not require IPC; IPC is reserved for a narrow desktop-environment query if the UI needs to distinguish Electron from a normal browser.

## File Boundaries

- `apps/lis/src/app/ui-theme-provider.tsx`: owns theme restoration, root attribute updates, and persistence.
- `apps/lis/src/app/ui-theme-toggle.tsx`: renders the accessible `Modern` / `Classic` segmented control.
- `apps/lis/src/app/layout.tsx`: installs the provider and changes visible metadata to Optrizo.
- `apps/lis/src/app/login/login-form.tsx`: changes visible Questcare/QC branding only.
- `apps/lis/src/app/(protected)/layout.tsx`: changes visible branding and mounts the persistent switch.
- `apps/lis/src/app/globals.css`: retains modern rules and adds classic-theme overrides without changing markup or data behavior.
- `apps/desktop/main.js`: owns the Electron lifecycle and hardened BrowserWindow.
- `apps/desktop/preload.js`: exposes the minimal desktop bridge through `contextBridge`.
- `apps/desktop/package.json`: supplies local Electron development scripts.
- Frontend tests cover branding, persistence, accessible switch state, and representative login/work-queue rendering in both themes.

## Theme Behavior

On first visit, the theme is `modern`. Selecting `Classic` updates the full interface without navigation or reload and stores `classic`. A later app launch restores that selection before or immediately at hydration without a visible theme flash. Selecting `Modern` reverses the process and persists `modern`.

The toggle uses buttons with `aria-pressed` state and remains keyboard accessible. Theme selection does not modify the user session, URL, server state, database, or any laboratory record.

## Electron Behavior and Security

The desktop window opens at a practical minimum size and loads the configured local LIS URL. It enables `contextIsolation`, disables `nodeIntegration`, uses a preload script, denies unexpected window creation, and sends external HTTP(S) links to the system browser only when explicitly requested by the user through normal link interaction.

Development mode expects the LIS server to be started separately. Packaging, auto-update, installers, production service orchestration, and database lifecycle management are outside this frontend demonstration.

## Backend Exclusions

Do not change Prisma schema or migrations, database content, API routes, auth/session behavior, analyzer gateway behavior, accession prefixes, patient identifiers, report rendering, package import names, or backend service code. Existing `QC` values that are domain data rather than visible product branding remain unchanged.

## Verification

Automated checks must demonstrate a failing branding/theme expectation before implementation, then pass after the change. Browser validation must cover app load, login, work queue, Modern-to-Classic switching, Classic-to-Modern switching, persisted selection after reload, console health, and screenshots of both themes. Electron validation must cover main-process syntax, secure BrowserWindow options, and a smoke launch when the local environment supports GUI execution.

## Acceptance Criteria

1. All visible product branding reads `Optrizo` rather than `Questcare`.
2. The classic view matches Option A's softened styling, without heavy Windows UI chrome.
3. No visible interface copy describes the theme as retro.
4. Users can switch between `Modern` and `Classic` instantly on login and protected screens.
5. The selected theme survives reloads and Electron restarts.
6. The same routes, data, permissions, and clinical workflows operate in both themes.
7. Electron exposes no unrestricted Node.js capability to renderer content.
8. No backend or clinical-domain behavior changes.
