// this file is NOT executed in the main process but rather can be used in the renderer process
// it helps to not get the api wrong by adding a layer, that enforces type safety and keeping
// the sender and the receiver close together.

import {
  ipcRenderer,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron';
import { MenuItemConstructorOptionsIpc, ServerInfo } from '../types';

export function saveFile(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
  return ipcRenderer.invoke('save-file', options);
}

export function openFile(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  return ipcRenderer.invoke('open-file', options);
}

export function openTextInSystem(options: { name: string; text: string }): Promise<void> {
  return ipcRenderer.invoke('open-text-in-system', options);
}

export function getAbout(): Promise<{ version: string }> {
  return ipcRenderer.invoke('get-about');
}

export function setMenu(contents: MenuItemConstructorOptionsIpc[]): void {
  ipcRenderer.send('set-menu', contents);
}

export function showMenu(): void {
  ipcRenderer.send('show-menu');
}

export function requestLocalServerInfo(): void {
  ipcRenderer.send('local-server-request');
}

export function subscribeLocalServerStderr(callback: (stderr: string) => void): void {
  ipcRenderer.on('local-server-stderr', (event, arg: string) => {
    callback(arg);
  });
}

export function subscribeLocalServerInfo(callback: (stderr: ServerInfo) => void): void {
  ipcRenderer.on('local-server-info', (event, arg: ServerInfo) => {
    callback(arg);
  });
}

export function subscribeOpenAbout(callback: () => void): void {
  ipcRenderer.on('open-about', callback);
}
