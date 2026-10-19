const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const log = require('./log');
const { bus } = require('./state');

const VERSION = require('../package.json').version;
const REPO = 'bushin1/citations-injector';

let updateInfo = null;

function getAssetName() {
  if (process.platform === 'win32') return 'citations-injector-win.exe';
  if (process.platform === 'darwin') return 'citations-injector-mac';
  return 'citations-injector-linux';
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'citations-injector' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    };
    get(url);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      const mod = u.startsWith('https') ? https : http;
      mod.get(u, { headers: { 'User-Agent': 'citations-injector' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const stream = fs.createWriteStream(dest);
        res.pipe(stream);
        stream.on('finish', () => { stream.close(); resolve(); });
      }).on('error', reject);
    };
    get(url);
  });
}

function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}

async function checkForUpdate() {
  try {
    const { data } = await httpsGet(`https://api.github.com/repos/${REPO}/releases/latest`);
    const release = JSON.parse(data);
    const latest = release.tag_name;

    if (compareVersions(VERSION, latest) >= 0) {
      updateInfo = null;
      return null;
    }

    const assetName = getAssetName();
    const asset = release.assets.find(a => a.name === assetName);
    if (!asset) return null;

    updateInfo = {
      current: VERSION,
      latest: latest.replace(/^v/, ''),
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      notes: release.body || '',
    };

    log.ok(`Mise à jour disponible : v${VERSION} → ${latest}`);
    bus.emit('update');
    return updateInfo;
  } catch (err) {
    log.warn(`Vérification mise à jour échouée : ${err.message}`);
    return null;
  }
}

async function applyUpdate() {
  if (!updateInfo) return false;

  try {
    log.info('Téléchargement de la mise à jour…');
    bus.emit('update');

    const currentBinary = process.pkg ? process.execPath : null;
    if (!currentBinary) {
      log.warn('Mise à jour auto disponible uniquement en mode packagé');
      return false;
    }

    const tmpFile = currentBinary + '.new';
    await downloadFile(updateInfo.downloadUrl, tmpFile);

    if (process.platform === 'win32') {
      const oldFile = currentBinary + '.old';
      try { fs.unlinkSync(oldFile); } catch {}
      fs.renameSync(currentBinary, oldFile);
      fs.renameSync(tmpFile, currentBinary);
    } else {
      fs.renameSync(tmpFile, currentBinary);
      fs.chmodSync(currentBinary, 0o755);
    }

    log.ok('Mise à jour installée — redémarrage…');

    spawn(currentBinary, process.argv.slice(1), {
      detached: true,
      stdio: 'ignore',
    }).unref();

    process.exit(0);
  } catch (err) {
    log.warn(`Échec mise à jour : ${err.message}`);
    return false;
  }
}

function getUpdateInfo() {
  return updateInfo;
}

module.exports = { checkForUpdate, applyUpdate, getUpdateInfo };
