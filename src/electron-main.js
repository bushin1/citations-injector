const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

const SERVER_PORT = parseInt(process.env.UI_PORT || '3847', 10);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    title: 'Allo Chantiers',
    backgroundColor: '#0f1117',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);

  // Les liens target="_blank" (Ouvrir un annuaire) s'ouvrent dans le navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Le serveur local démarre en parallèle : si la fenêtre charge trop tôt, on réessaie.
  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => { if (mainWindow) mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`); }, 500);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Allo Chantiers');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ouvrir Allo Chantiers', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Quitter', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) mainWindow.show();
    else createWindow();
  });
}

app.whenReady().then(() => {
  // Dossier de stockage local (jeton d'accès, etc.) accessible au backend
  process.env.AC_USERDATA = app.getPath('userData');

  // Start the backend server + scan loop
  require('./main-backend');

  // Auto-update (electron-updater)
  try { require('./updater').initUpdater(); } catch {}

  createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow) mainWindow.show();
    else createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
