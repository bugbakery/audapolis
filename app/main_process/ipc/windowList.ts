import { BrowserWindow } from 'electron';

export const windowList: BrowserWindow[] = [];

export function sendAll(channel: string, payload: unknown): void {
  windowList.forEach((window) => {
    window.webContents.send(channel, payload);
  });
}
