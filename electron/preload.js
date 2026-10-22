const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("MM_HOST", {
  isElectron: true,
  info: () => ipcRenderer.invoke("app:info"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  scan: (dir) => ipcRenderer.invoke("fs:scan", dir),
  read: (file) => ipcRenderer.invoke("fs:read", file),
  readParsed: (file) => ipcRenderer.invoke("fs:readParsed", file),
  parseText: (text) => ipcRenderer.invoke("fs:parseText", text),
  write: (file, text) => ipcRenderer.invoke("fs:write", file, text),
  saveAs: (name) => ipcRenderer.invoke("dialog:saveFile", name),
  reveal: (file) => ipcRenderer.invoke("shell:showItem", file),
  openJson: () => ipcRenderer.invoke("dialog:openJson"),
  listBackups: (dir) => ipcRenderer.invoke("fs:listBackups", dir),
  deleteFiles: (paths) => ipcRenderer.invoke("fs:deleteFiles", paths)
});
