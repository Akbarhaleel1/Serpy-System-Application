// Prints HTML to PDF on behalf of the embedded backend.
//
// Electron already ships Chromium, so the desktop build skips Puppeteer and its
// separate ~350MB browser download entirely. The backend sends HTML over the
// fork IPC channel; we render it in an offscreen window and send the bytes back.

const { BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const crypto = require('crypto');

const MM_PER_INCH = 25.4;

async function renderToPdf({ html, marginMm = 20, landscape = false }) {
  // Rendered from a temp file rather than a data: URL - invoices can carry
  // sizeable embedded logos, and data: URLs hit length limits.
  const tmpFile = path.join(
    os.tmpdir(),
    `serpy-print-${crypto.randomUUID()}.html`
  );
  await fs.writeFile(tmpFile, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
      // Untrusted-ish content: it is our own template, but it interpolates
      // customer-supplied fields, so give it no privileges at all.
      contextIsolation: true,
      nodeIntegration: false,
      javascript: false,
    },
  });

  try {
    await win.loadFile(tmpFile);

    const marginInches = marginMm / MM_PER_INCH;

    return await win.webContents.printToPDF({
      pageSize: 'A4',
      landscape,
      printBackground: true,
      margins: {
        top: marginInches,
        bottom: marginInches,
        left: marginInches,
        right: marginInches,
      },
    });
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await fs.unlink(tmpFile).catch(() => {});
  }
}

/**
 * Wire a spawned backend child process up to this renderer.
 * Called by backend-runner once the child exists.
 */
function attach(child) {
  child.on('message', async (msg) => {
    if (msg?.type !== 'render-pdf') return;

    try {
      const buffer = await renderToPdf(msg);
      child.send({
        type: 'render-pdf-result',
        id: msg.id,
        data: buffer.toString('base64'),
      });
    } catch (err) {
      child.send({
        type: 'render-pdf-result',
        id: msg.id,
        error: err.message,
      });
    }
  });
}

module.exports = { attach, renderToPdf };
