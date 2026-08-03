const fs = require('fs');
const path = require('path');

const clientDist = path.join(__dirname, '..', 'client', 'dist');
const target = path.join(__dirname, 'app');

if (!fs.existsSync(clientDist)) {
  console.error(
    `\nMissing ${clientDist}\nRun "npm run build" inside client/ first, then re-run this command.\n`
  );
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(clientDist, target, { recursive: true });
console.log(`Copied ${clientDist} -> ${target}`);
