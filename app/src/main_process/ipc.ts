import { BrowserWindow, dialog, ipcMain } from 'electron';

ipcMain.handle('open-file', (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    return dialog.showOpenDialog(win, options);
  } else {
    dialog.showOpenDialog(options);
  }
});

ipcMain.handle('save-file', (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    return dialog.showSaveDialog(win, options);
  } else {
    dialog.showSaveDialog(options);
  }
});
