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
