// Bridge between the React renderer and the desktop shell.
//
// The renderer no longer talks to a hosted API - it talks to an Express server
// running locally on a port only the shell knows. It needs three things from
// here: where that server is, the per-launch key to authenticate to it, and the
// activation flow for a fresh install.
//
// Nothing here exposes Node or the filesystem; each channel is a fixed,
// named operation.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serpy', {
  isDesktop: true,

  /** Activation state, local API address and key. Called on renderer boot. */
  getStatus: () => ipcRenderer.invoke('serpy:get-status'),

  /** Exchange a paid licence key for scoped DB credentials and start the API. */
  activate: (licenceKey) => ipcRenderer.invoke('serpy:activate', { licenceKey }),

  /** Save the new support expiry after a renewal has been paid and verified. */
  recordRenewal: (supportExpiresAt) =>
    ipcRenderer.invoke('serpy:record-renewal', { supportExpiresAt }),

  /** Forget the licence on this machine (e.g. moving to another computer). */
  deactivate: () => ipcRenderer.invoke('serpy:deactivate'),

  /** Live backend/database status: connecting, connected, or errored. */
  onBackendStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('serpy:backend-status', handler);
    return () => ipcRenderer.removeListener('serpy:backend-status', handler);
  },
});
