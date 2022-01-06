import { app, BrowserWindow, session } from 'electron';
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';

export const createWindow = (): void => {
  const window = new BrowserWindow({
    height: 600,
    width: 800,
    frame: false,
    titleBarStyle: 'hiddenInset',
    titleBarOverlay: true,
    trafficLightPosition: { x: 21, y: 21 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableBlinkFeatures: 'ClipboardCustomFormats',
      nativeWindowOpen: true,
    },
    show: false,
  });

  window.webContents.on('new-window', (event, url, frameName, disposition, options) => {
    if (frameName === 'modal') {
      event.preventDefault();
      event.newGuest = new BrowserWindow({
        ...options,
        parent: window,
        width: 500,
        height: 400,
      });
    }
  });

  if (process.env.NODE_ENV === 'development') {
    (async () => {
      await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
        .then((name: string) => console.log(`Added Extension:  ${name}`))
        .catch((err: string) => console.log('An error occurred: ', err))
        .finally(() => {
          window.webContents.openDevTools();
        });
      await window.loadURL(import.meta.env.VITE_DEV_SERVER_URL);
    })();
  } else {
    (async () => {
      await window.loadURL(new URL('../build/src/index.html', 'file://' + __dirname).toString());
    })();
  }
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        // TODO better policy
        'Content-Security-Policy': [
          "default-src *  data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'",
        ],
      },
    });
  });

  windowList.push(window);
  window.on('close', () => {
    const i = windowList.findIndex((x) => x == window);
    windowList.splice(i, 1);
  });

  setMenu(window, []);
  window.on('focus', () => {
    applyMenu(window);
  });
  window.on('blur', () => {
    unregisterAccelerators();
  });

  window.on('ready-to-show', () => window.show());
};

app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

(global as any).window = {};
import './ipc/ipc';
import './server';
import { windowList } from './ipc/windowList';
import { applyMenu, setMenu, unregisterAccelerators } from './menu';
