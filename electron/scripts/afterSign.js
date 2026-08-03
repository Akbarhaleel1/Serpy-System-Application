// electron-builder ships prebuilt Electron binaries that carry stale/revoked
// notarization tickets from the Electron project, which makes Gatekeeper
// report the packaged app as "revoked" instead of the normal "unsigned"
// state (worse: users get no "Open Anyway" option). Re-signing ad-hoc after
// packaging clears that and leaves the standard, resolvable Gatekeeper
// warning for an unsigned app.
const path = require('path');
const { execSync } = require('child_process');

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
};
