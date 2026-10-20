// Mise à jour via electron-updater.
// - Windows : auto complet (télécharge en fond, installe + redémarre au clic).
// - Mac (non signé) : détecte la nouvelle version, affiche le bandeau, le clic ouvre la page
//   de release pour télécharger le .dmg (Squirrel.Mac exige une signature pour l'install auto).

const VERSION = require('../package.json').version;

let updateInfo = null;   // { current, latest, status, percent? }
let downloaded = false;
let autoUpdater = null;

function emitUpdate() {
  try { require('./state').bus.emit('update'); } catch {}
}

function logOk(m) { try { require('./log').ok(m); } catch {} }
function logWarn(m) { try { require('./log').warn(m); } catch {} }

// Appelé par electron-main une fois l'app prête. No-op hors Electron (mode CLI dev).
function initUpdater() {
  if (!process.versions || !process.versions.electron) return;

  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    logWarn(`electron-updater indisponible : ${e.message}`);
    return;
  }

  const isMac = process.platform === 'darwin';
  autoUpdater.autoDownload = !isMac;          // Windows télécharge seul ; Mac non (install non signée impossible)
  autoUpdater.autoInstallOnAppQuit = !isMac;
  autoUpdater.logger = null;

  autoUpdater.on('update-available', (info) => {
    updateInfo = { current: VERSION, latest: info.version, status: isMac ? 'available' : 'downloading' };
    logOk(`Mise à jour disponible : v${VERSION} → v${info.version}`);
    emitUpdate();
  });

  autoUpdater.on('download-progress', (p) => {
    if (updateInfo) {
      updateInfo.status = 'downloading';
      updateInfo.percent = Math.round(p.percent || 0);
      emitUpdate();
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    downloaded = true;
    updateInfo = { current: VERSION, latest: info.version, status: 'ready' };
    logOk('Mise à jour téléchargée — prête à installer');
    emitUpdate();
  });

  autoUpdater.on('update-not-available', () => { updateInfo = null; emitUpdate(); });
  autoUpdater.on('error', (err) => { logWarn(`MàJ : ${err && err.message ? err.message : err}`); });

  autoUpdater.checkForUpdates().catch((e) => logWarn(`Vérif MàJ : ${e.message}`));

  // Re-vérifie toutes les 6 h tant que l'app tourne
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 6 * 60 * 60 * 1000);
}

async function applyUpdate() {
  // Mac non signé : on ouvre la page de release pour télécharger le .dmg à la main.
  if (process.platform === 'darwin') {
    try {
      require('electron').shell.openExternal('https://github.com/bushin1/citations-injector/releases/latest');
      return true;
    } catch { return false; }
  }

  if (!autoUpdater) return false;

  if (downloaded) {
    setImmediate(() => autoUpdater.quitAndInstall());
    return true;
  }

  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (e) {
    logWarn(`Téléchargement MàJ échoué : ${e.message}`);
    return false;
  }
}

function getUpdateInfo() { return updateInfo; }

// Conservé pour le mode CLI (main.js) : la vraie vérif passe par initUpdater sous Electron.
function checkForUpdate() {}

module.exports = { initUpdater, checkForUpdate, applyUpdate, getUpdateInfo };
