// Built to build/preload-popover.cjs. Exposes the minimal IPC surface the
// popover UI needs — no Node access in the renderer.
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('drawin', {
  snapshot: () => ipcRenderer.invoke('drawin:snapshot'),
  openDashboard: () => ipcRenderer.invoke('drawin:open-dashboard'),
  copyBaseUrl: () => ipcRenderer.invoke('drawin:copy-base-url'),
  copyApiKey: () => ipcRenderer.invoke('drawin:copy-api-key'),
  setLoginItem: (open: boolean) => ipcRenderer.invoke('drawin:set-login-item', open),
  quit: () => ipcRenderer.invoke('drawin:quit'),
  onRefresh: (cb: () => void) => ipcRenderer.on('drawin:refresh', cb),
});
