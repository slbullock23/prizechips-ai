import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("blur", {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),
});
