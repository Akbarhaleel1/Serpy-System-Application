// Fails the build if anything secret made it into the package.
//
// The installer goes to paying customers, so a stray backend/.env would hand
// every buyer our SMTP, Razorpay and database credentials. package.json filters
// are supposed to prevent that, but a filter typo is silent - this is not.

const path = require('path');
const fs = require('fs');

// Files that must never ship, matched by exact basename
const FORBIDDEN_NAMES = new Set(['.env', '.env.local', '.env.production', '.env.development']);

// Directories that would bloat the installer if the filters slipped
const FORBIDDEN_DIRS = new Set(['puppeteer', 'puppeteer-core']);

function walk(dir, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (FORBIDDEN_DIRS.has(entry.name)) {
        found.push(full);
        continue; // no need to descend
      }
      walk(full, found);
    } else if (FORBIDDEN_NAMES.has(entry.name)) {
      found.push(full);
    }
  }

  return found;
}

// Where extraResources land, which is not the same shape on every platform:
// macOS buries them in the .app bundle, Windows and Linux keep them beside the
// executable.
function resourcesDir(context) {
  if (context.electronPlatformName === 'darwin') {
    const appName = context.packager.appInfo.productFilename;
    return path.join(context.appOutDir, `${appName}.app`, 'Contents', 'Resources');
  }

  return path.join(context.appOutDir, 'resources');
}

module.exports = async function afterPack(context) {
  const resources = resourcesDir(context);
  const backend = path.join(resources, 'backend');

  if (!fs.existsSync(backend)) {
    throw new Error(
      `afterPack: no backend/ inside ${resources} - the app cannot run without it. ` +
        'Check the extraResources config in package.json.'
    );
  }

  // A backend without its dependencies packages perfectly happily and then
  // dies with MODULE_NOT_FOUND on the customer's machine, so treat a missing
  // install as a build failure rather than a runtime surprise.
  if (!fs.existsSync(path.join(backend, 'node_modules', 'express'))) {
    throw new Error(
      'afterPack: backend/node_modules is missing or incomplete - the packaged ' +
        'server would fail to start. Run `npm ci --omit=dev` in backend/ before building.'
    );
  }

  const offenders = walk(backend);

  if (offenders.length) {
    const list = offenders.map((f) => `  - ${path.relative(resources, f)}`).join('\n');
    throw new Error(
      `afterPack: refusing to ship secrets or bundled Chromium:\n${list}\n\n` +
        'Fix the extraResources filter in electron/package.json.'
    );
  }

  console.log('✅ afterPack: backend bundled, no .env or Puppeteer inside');
};
