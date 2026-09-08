const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("optrizoDesktop", {
  getEnvironment: () => ipcRenderer.invoke("desktop:get-environment"),
});
