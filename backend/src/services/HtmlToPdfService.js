// Renders HTML to a PDF buffer.
//
// The hosted server uses Puppeteer, which downloads its own ~350MB Chromium.
// The desktop app already *is* Chromium, so bundling a second copy would nearly
// double the installer for no benefit - there, we hand the HTML to the Electron
// shell over the fork IPC channel and let it print through an offscreen window.

const EMBEDDED = process.env.SERPY_EMBEDDED === '1';
const CAN_ASK_SHELL = EMBEDDED && typeof process.send === 'function';

const RENDER_TIMEOUT_MS = 60000;

const pending = new Map();
let nextId = 1;

if (CAN_ASK_SHELL) {
  process.on('message', (msg) => {
    if (msg?.type !== 'render-pdf-result') return;

    const entry = pending.get(msg.id);
    if (!entry) return;

    pending.delete(msg.id);
    clearTimeout(entry.timer);

    if (msg.error) entry.reject(new Error(msg.error));
    else entry.resolve(Buffer.from(msg.data, 'base64'));
  });
}

function renderViaShell(html, { marginMm, landscape }) {
  return new Promise((resolve, reject) => {
    const id = nextId++;

    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Timed out waiting for the desktop app to render the PDF'));
    }, RENDER_TIMEOUT_MS);

    pending.set(id, { resolve, reject, timer });
    process.send({ type: 'render-pdf', id, html, marginMm, landscape });
  });
}

async function renderViaPuppeteer(html, { marginMm, landscape }) {
  // Required lazily: the desktop build ships without Puppeteer entirely
  const puppeteer = require('puppeteer');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const margin = `${marginMm}mm`;
    return await page.pdf({
      format: 'A4',
      landscape: Boolean(landscape),
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      printBackground: true,
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.warn('Error closing browser:', err.message);
      }
    }
  }
}

/**
 * @param {string} html
 * @param {{ marginMm?: number, landscape?: boolean }} [options]
 * @returns {Promise<Buffer>}
 */
async function render(html, options = {}) {
  const settings = {
    marginMm: options.marginMm ?? 20,
    landscape: options.landscape ?? false,
  };

  return CAN_ASK_SHELL
    ? renderViaShell(html, settings)
    : renderViaPuppeteer(html, settings);
}

module.exports = { render };
