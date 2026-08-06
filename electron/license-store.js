// Persists the activated licence and the scoped Atlas connection string.
//
// The connection string is the one genuinely sensitive thing on disk, so it is
// encrypted with Electron's safeStorage (Keychain on macOS, DPAPI on Windows,
// libsecret on Linux) rather than written as plain JSON.
//
// This is not a defence against the machine's own owner - they can always read
// what their app can read. It is scoped credentials that limit the blast
// radius: the string only grants access to this customer's own database.

const path = require('path');
const fs = require('fs');
const { app, safeStorage } = require('electron');

const FILE = () => path.join(app.getPath('userData'), 'licence.dat');

function isEncryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function save(record) {
  const json = JSON.stringify(record);
  const file = FILE();

  if (isEncryptionAvailable()) {
    const blob = safeStorage.encryptString(json);
    fs.writeFileSync(file, blob, { mode: 0o600 });
    return;
  }

  // No OS keychain (some Linux desktops). Still restrict to the user account
  // and mark the payload so load() knows it isn't encrypted.
  console.warn('[licence] OS encryption unavailable - storing with file permissions only');
  fs.writeFileSync(file, `plain:${json}`, { mode: 0o600 });
}

function load() {
  const file = FILE();
  let raw;

  try {
    raw = fs.readFileSync(file);
  } catch {
    return null;
  }

  try {
    const asText = raw.toString('utf8');
    if (asText.startsWith('plain:')) {
      return JSON.parse(asText.slice('plain:'.length));
    }
    return JSON.parse(safeStorage.decryptString(raw));
  } catch (err) {
    // Corrupt, or written by a different OS user / keychain
    console.error('[licence] could not read stored licence:', err.message);
    return null;
  }
}

function clear() {
  try {
    fs.unlinkSync(FILE());
  } catch {
    /* nothing stored */
  }
}

module.exports = { save, load, clear };
