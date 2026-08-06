// Runs the SerpY Express backend as a child process of the desktop app.
//
// The packaged app has no `node` binary of its own, so we re-launch Electron
// itself in Node mode (ELECTRON_RUN_AS_NODE) and point it at the backend entry.
// The backend picks its own loopback port and reports it back over the fork IPC
// channel, along with whether it managed to reach MongoDB.

const { fork } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { app } = require('electron');
const pdfRenderer = require('./pdf-renderer');

// How long to wait for the child to bind a port before treating it as failed
const START_TIMEOUT_MS = 30000;
// Backoff between crash restarts, so a boot loop doesn't spin the CPU
const RESTART_DELAY_MS = 2000;
const MAX_RESTARTS = 5;

let child = null;
let restarts = 0;
let shuttingDown = false;
let currentConfig = null;

const state = {
  port: null,
  localKey: null,
  dbConnected: false,
  lastError: null,
};

const listeners = new Set();

function emit() {
  for (const fn of listeners) fn({ ...state });
}

/** Subscribe to backend status changes. Returns an unsubscribe function. */
function onStatusChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function backendEntry() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'src', 'server.js')
    : path.join(__dirname, '..', 'backend', 'src', 'server.js');
}

function backendRoot() {
  return path.dirname(path.dirname(backendEntry()));
}

// The JWT secret only ever signs tokens for this one installation, so we
// generate it locally on first run rather than shipping a shared one.
function installJwtSecret() {
  const file = path.join(app.getPath('userData'), 'jwt-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

/**
 * Start the backend against a given Mongo connection string.
 * Resolves once the child is listening; rejects if it never gets there.
 */
function start({ mongoUri, extraEnv = {} }) {
  if (child) return Promise.resolve({ ...state });

  shuttingDown = false;
  currentConfig = { mongoUri, extraEnv };

  // Regenerated every launch - it only has to outlive this process
  state.localKey = crypto.randomBytes(32).toString('hex');
  state.dbConnected = false;
  state.lastError = null;

  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Backend did not start within 30s'));
    }, START_TIMEOUT_MS);

    child = fork(backendEntry(), [], {
      cwd: backendRoot(),
      silent: true,
      execPath: process.execPath,
      env: {
        ...process.env,
        ...extraEnv,
        ELECTRON_RUN_AS_NODE: '1',
        SERPY_EMBEDDED: '1',
        SERPY_LOCAL_KEY: state.localKey,
        MONGODB_URI: mongoUri,
        JWT_SECRET: extraEnv.JWT_SECRET || installJwtSecret(),
        NODE_ENV: 'production',
        // Writable location for generated PDFs and uploads - the app bundle
        // itself is read-only once installed.
        SERPY_DATA_DIR: app.getPath('userData'),
      },
    });

    child.stdout?.on('data', (d) => console.log('[backend]', String(d).trimEnd()));
    child.stderr?.on('data', (d) => console.error('[backend]', String(d).trimEnd()));

    // Lets the backend print invoices through our Chromium instead of shipping
    // Puppeteer's own copy
    pdfRenderer.attach(child);

    child.on('message', (msg) => {
      if (msg?.type === 'listening') {
        state.port = msg.port;
        restarts = 0;
        emit();
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ ...state });
        }
      }

      if (msg?.type === 'db-connected') {
        state.dbConnected = true;
        state.lastError = null;
        emit();
      }

      if (msg?.type === 'db-error') {
        state.dbConnected = false;
        state.lastError = msg.message;
        emit();
      }
    });

    child.on('exit', (code, signal) => {
      child = null;
      state.port = null;
      state.dbConnected = false;
      emit();

      if (shuttingDown) return;

      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Backend exited during startup (code ${code}, signal ${signal})`));
        return;
      }

      // Crashed after a healthy start - bring it back, with a ceiling so a
      // persistent failure surfaces to the user instead of looping forever.
      if (restarts < MAX_RESTARTS) {
        restarts += 1;
        console.warn(`[backend] exited (${code}); restart ${restarts}/${MAX_RESTARTS}`);
        setTimeout(() => {
          if (!shuttingDown && currentConfig) start(currentConfig).catch(() => {});
        }, RESTART_DELAY_MS);
      } else {
        state.lastError = 'Backend keeps crashing on startup';
        emit();
      }
    });
  });
}

function stop() {
  shuttingDown = true;
  if (!child) return;
  child.kill();
  child = null;
  state.port = null;
  state.dbConnected = false;
}

function getState() {
  return { ...state };
}

module.exports = { start, stop, getState, onStatusChange };
