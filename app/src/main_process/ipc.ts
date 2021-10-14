import { BrowserWindow, dialog, ipcMain } from 'electron';
import { assertSome } from '../util';

ipcMain.handle('open-file', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  return dialog.showOpenDialogSync(win, options);
});

ipcMain.handle('save-file', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  return dialog.showSaveDialogSync(win, options);
});
