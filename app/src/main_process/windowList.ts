import { BrowserWindow } from 'electron';

export const windowList: BrowserWindow[] = [];

export function sendAll(channel: string, payload: any): void {
  windowList.forEach((window) => {
    window.webContents.send(channel, payload);
  });
}
