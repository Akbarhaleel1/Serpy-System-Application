// macOS Gatekeeper kills (and deletes) the ad-hoc-unsigned Electron binary
// that npm downloads on install. Re-signing it locally after every install
// fixes launch crashes without needing a real Developer ID certificate.
const { execSync } = require('child_process');
const path = require('path');

if (process.platform !== 'darwin') process.exit(0);

const appPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'Electron.app');

try {
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.warn('Could not re-sign Electron.app:', err.message);
}
