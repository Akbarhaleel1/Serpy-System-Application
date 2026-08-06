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

module.exports = async function afterPack(context) {
  const resources = path.join(context.appOutDir, 'resources');
  const backend = path.join(resources, 'backend');

  if (!fs.existsSync(backend)) {
    throw new Error(
      `afterPack: no backend/ inside ${resources} - the app cannot run without it. ` +
        'Check the extraResources config in package.json.'
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
