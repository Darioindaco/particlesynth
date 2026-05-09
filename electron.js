const { app, BrowserWindow, session } = require('electron');
const path = require('path');
require('electron-reload')(__dirname, { electron: path.join(__dirname, 'node_modules', 'electron', 'index.js') });

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Grant audio and video permissions without prompting the user
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'audioCapture' || permission === 'videoCapture') {
      callback(true);
    } else {
      callback(false);
    }
  });

  win.loadFile('index.html');

  // Show window once ready to avoid white flash on startup
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWindow);

// Quit when all windows are closed (including on Mac)
app.on('window-all-closed', () => app.quit());
