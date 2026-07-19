const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize-toggle"),
  close: () => ipcRenderer.invoke("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  openDevTools: () => ipcRenderer.invoke("open-devtools"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onMaximizeChange: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on("window-maximize-changed", subscription);
    return () => {
      ipcRenderer.removeListener("window-maximize-changed", subscription);
    };
  },
});
