import { BrowserWindow, dialog, ipcMain } from 'electron';
import { assertSome } from '../util';

ipcMain.handle('open-file', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  return dialog.showOpenDialog(win, options);
});

ipcMain.handle('save-file', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  return dialog.showSaveDialog(win, options);
});
