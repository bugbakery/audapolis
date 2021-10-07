import { BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron';
import { assertSome } from '../util';
import { createWindow } from './index';

export const menuMap: Record<number, Menu> = {};

function onMac(
  mac: MenuItemConstructorOptions[],
  otherPlatforms: MenuItemConstructorOptions[] = []
): MenuItemConstructorOptions[] {
  return process.platform === 'darwin' ? mac : otherPlatforms;
}

type PatchType = { click?: string; submenu?: MenuItemConstructorOptionsIpc[] };
export type MenuItemConstructorOptionsIpc = Exclude<MenuItemConstructorOptions, PatchType> &
  PatchType;

export function setMenu(window: BrowserWindow, args: MenuItemConstructorOptionsIpc[]): void {
  const transformMenuTemplate = (
    x: MenuItemConstructorOptionsIpc[]
  ): MenuItemConstructorOptions[] => {
    return x.map((x) => ({
      ...x,
      click: () => {
        x.click && window.webContents.send('menu-click', x.click);
      },
      submenu: x.submenu && transformMenuTemplate(x.submenu),
    }));
  };

  const template = [
    ...onMac([
      {
        role: 'appMenu',
      },
    ]),
    ...transformMenuTemplate(args),
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        {
          label: window.isMaximized() ? 'Un-Maximize' : 'Maximize',
          click: async function () {
            if (window.isMaximized()) {
              window.unmaximize();
            } else {
              window.maximize();
            }
          },
        },
        { role: 'togglefullscreen' },
        ...onMac(
          [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }],
          [{ role: 'close' }]
        ),
        { role: 'toggleDevTools', accelerator: 'CommandOrControl+Alt+I' },
        {
          label: 'New Window',
          click: function () {
            createWindow();
          },
          accelerator: 'CommandOrControl+N',
        },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/audapolis/audapolis');
          },
        },
      ],
    },
  ] as MenuItemConstructorOptions[];

  menuMap[window.id] = Menu.buildFromTemplate(template);
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    Menu.setApplicationMenu(menuMap[focusedWindow.id]);
  }
}

ipcMain.on('set-menu', (event, args) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  setMenu(win, args);
});

ipcMain.on('show-menu', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  menuMap[win.id].popup({
    x: 0,
    y: 55,
  });
});
