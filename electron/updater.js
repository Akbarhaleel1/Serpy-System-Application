// Auto-update against GitHub Releases.
//
// electron-updater reads the `publish` block in package.json to find the feed,
// downloads new versions in the background, and swaps them in on next launch.
// Updates are skipped in development, where there is no packaged app to replace.

const { app, dialog } = require('electron');

function checkForUpdates() {
  if (!app.isPackaged) {
    console.log('[updater] skipped - not a packaged build');
    return;
  }

  // Required lazily so `electron .` in development works without the dependency
  const { autoUpdater } = require('electron-updater');

  autoUpdater.autoDownload = true;
  // Let the user finish what they are doing; the update lands on next start.
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    // A failed update check must never block someone from using the app
    console.error('[updater]', err?.message || err);
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] downloading', info.version);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `SerpY ${info.version} is ready to install.`,
      detail: 'Restart to finish updating, or it will be applied next time you quit.',
    });

    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] check failed:', err?.message || err);
  });
}

module.exports = { checkForUpdates };
