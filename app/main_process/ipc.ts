import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { assertSome } from '../src/util';
import path from 'path';
import fs from 'fs';

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

ipcMain.handle('open-text-in-system', (event, options) => {
  console.log('app', app);
  const tempdir = app.getPath('temp');
  const filepath = path.join(tempdir, options.name);
  fs.writeFileSync(filepath, options.text);
  shell.openPath(filepath);
});

ipcMain.handle('get-about', () => {
  return {
    version: app.getVersion(),
  };
});
