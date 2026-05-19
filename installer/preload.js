const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("installerApi", {
  getDefaults: () => ipcRenderer.invoke("installer:getDefaults"),
  getStatus: (installDir) => ipcRenderer.invoke("installer:getStatus", installDir),
  pickDirectory: (currentPath) =>
    ipcRenderer.invoke("installer:pickDirectory", currentPath),
  validatePath: (installDir) =>
    ipcRenderer.invoke("installer:validatePath", installDir),
  runInstall: (opts) => ipcRenderer.invoke("installer:runInstall", opts),
  runRepair: (opts) => ipcRenderer.invoke("installer:runRepair", opts),
  runUninstall: (opts) => ipcRenderer.invoke("installer:runUninstall", opts),
  launchApp: (exePath) => ipcRenderer.invoke("installer:launchApp", exePath),
  checkUpdates: (installDir) =>
    ipcRenderer.invoke("installer:checkUpdates", installDir),
  openExternal: (url) => ipcRenderer.invoke("installer:openExternal", url),
  fetchPoster: (url) => ipcRenderer.invoke("installer:fetchPoster", url),
  minimize: () => ipcRenderer.invoke("installer:minimize"),
  close: () => ipcRenderer.invoke("installer:close"),
  onProgress: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on("installer:progress", handler);
    return () => ipcRenderer.removeListener("installer:progress", handler);
  },
});
