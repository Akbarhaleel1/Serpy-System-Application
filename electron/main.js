const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const serve = require('electron-serve');

const backend = require('./backend-runner');
const licenceStore = require('./license-store');
const { checkForUpdates } = require('./updater');

const loadURL = serve({ directory: 'app' });

// Where account creation, payment verification and activation happen.
// Everything else runs locally on the customer's machine.
const LICENCE_API =
  process.env.SERPY_LICENCE_API || 'https://licence-service.vercel.app/api';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'SerpY',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  loadURL(mainWindow);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Stable per-installation id, so the licence service can cap how many machines
// a single one-time purchase activates.
function machineId() {
  const file = path.join(app.getPath('userData'), 'machine-id');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const id = crypto.randomUUID();
    fs.writeFileSync(file, id, { mode: 0o600 });
    return id;
  }
}

// Push backend status to the renderer so it can show "connecting" / "offline"
backend.onStatusChange((status) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('serpy:backend-status', status);
  }
});

app.whenReady().then(async () => {
  const licence = licenceStore.load();

  if (licence?.mongoUri) {
    try {
      await backend.start({ mongoUri: licence.mongoUri });
    } catch (err) {
      // Surfaced to the renderer through serpy:get-status
      console.error('[main] backend failed to start:', err.message);
    }
  }

  createWindow();
  checkForUpdates();
});

// --- Renderer IPC -----------------------------------------------------------

// What the renderer needs on boot: is this copy activated, and where is the
// local API listening?
ipcMain.handle('serpy:get-status', () => {
  const licence = licenceStore.load();
  const status = backend.getState();

  return {
    activated: Boolean(licence?.mongoUri),
    email: licence?.email ?? null,
    // The customer's own licence number, so Settings can show it back to them
    // when they need it for support or to move to another machine. The scoped
    // mongoUri in the same record stays here - the renderer never needs it.
    licenceKey: licence?.licenceKey ?? null,
    activatedAt: licence?.activatedAt ?? null,
    // When cloud sync, backups, updates and support run out. The first year
    // comes with the licence; after that the app asks them to renew.
    supportExpiresAt: licence?.supportExpiresAt ?? null,
    apiBaseUrl: status.port ? `http://127.0.0.1:${status.port}/api` : null,
    localKey: status.localKey,
    dbConnected: status.dbConnected,
    lastError: status.lastError,
    licenceApi: LICENCE_API,
    machineId: machineId(),
    version: app.getVersion(),
  };
});

// Called once the renderer has completed signup + payment against the licence
// service and holds a licence key. We exchange it for this customer's scoped
// Atlas credentials and boot the local backend.
ipcMain.handle('serpy:activate', async (_event, { licenceKey }) => {
  let payload;

  try {
    const response = await fetch(`${LICENCE_API}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenceKey, machineId: machineId() }),
    });

    payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, message: payload.message || 'Activation failed' };
    }
  } catch (err) {
    return { ok: false, message: `Could not reach the licence server: ${err.message}` };
  }

  const licence = {
    licenceKey,
    mongoUri: payload.mongoUri,
    email: payload.email,
    customerId: payload.customerId,
    supportExpiresAt: payload.supportExpiresAt ?? null,
    activatedAt: new Date().toISOString(),
  };

  licenceStore.save(licence);

  try {
    await backend.start({ mongoUri: licence.mongoUri });
  } catch (err) {
    return { ok: false, message: `Activated, but the local server failed: ${err.message}` };
  }

  const status = backend.getState();
  return {
    ok: true,
    apiBaseUrl: `http://127.0.0.1:${status.port}/api`,
    localKey: status.localKey,
  };
});

// Called after the renderer has paid for another year and the licence service
// has verified it. Persisting the new date here is what stops the renewal
// prompt coming back on the next launch.
ipcMain.handle('serpy:record-renewal', (_event, { supportExpiresAt }) => {
  const licence = licenceStore.load();
  if (!licence) return { ok: false, message: 'No licence on this machine' };

  licenceStore.save({ ...licence, supportExpiresAt });
  return { ok: true };
});

ipcMain.handle('serpy:deactivate', () => {
  backend.stop();
  licenceStore.clear();
  return { ok: true };
});

// --- Lifecycle --------------------------------------------------------------

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => backend.stop());
app.on('will-quit', () => backend.stop());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
