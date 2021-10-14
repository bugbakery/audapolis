import { ipcRenderer, MenuItemConstructorOptions } from 'electron';
import { store } from '../state';
import {
  closeDocument,
  copy,
  cut,
  openDocumentFromDisk,
  paste,
  saveDocument,
  toggleDisplaySpeakerNames,
  toggleDisplayVideo,
} from '../state/editor';
import { transcribeFile } from '../state/transcribe';
import { ActionCreators } from 'redux-undo';
import { v4 as uuidv4 } from 'uuid';
import { MenuItemConstructorOptionsIpc } from '../main_process/menu';

export function setMenu(menu: MenuItemConstructorOptions[]): void {
  const listeners: Record<string, () => void> = {};
  const transformMenuTemplate = (
    x: MenuItemConstructorOptions[]
  ): MenuItemConstructorOptionsIpc[] => {
    const transformClick = (click: (...args: any) => void): string | undefined => {
      const uuid = uuidv4();
      listeners[uuid] = click;
      return uuid;
    };
    return x.map(
      (x) =>
        ({
          ...x,
          click: x.click && transformClick(x.click),
          submenu: x.submenu && transformMenuTemplate(x.submenu as MenuItemConstructorOptions[]),
        } as MenuItemConstructorOptionsIpc)
    );
  };
  const transformed = transformMenuTemplate(menu);

  ipcRenderer.removeAllListeners('menu-click');
  ipcRenderer.on('menu-click', (e, payload) => {
    listeners[payload]();
  });
  ipcRenderer.send('set-menu', transformed);
}

export const editorMenu: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        click: () => store.dispatch(openDocumentFromDisk()),
        accelerator: 'CommandOrControl+O',
      },
      { label: 'Import & Transcribe', click: () => store.dispatch(transcribeFile()) },
      { type: 'separator' },
      {
        label: 'Save',
        click: () => store.dispatch(saveDocument(false)),
        accelerator: 'CommandOrControl+S',
      },
      {
        label: 'Save As',
        click: () => store.dispatch(saveDocument(true)),
        accelerator: 'CommandOrControl+Shift+S',
      },
      { type: 'separator' },
      {
        label: 'Close Document',
        click: () => store.dispatch(closeDocument()),
        accelerator: 'CommandOrControl+Shift+W',
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        click: () => store.dispatch(ActionCreators.undo()),
        accelerator: 'CommandOrControl+Z',
      },
      {
        label: 'Redo',
        click: () => store.dispatch(ActionCreators.redo()),
        accelerator: 'CommandOrControl+Shift+Z, CommandOrControl+Y',
      },
      { type: 'separator' },
      { label: 'Cut', click: () => store.dispatch(cut()), accelerator: 'Control+X' },
      { label: 'Copy', click: () => store.dispatch(copy()), accelerator: 'Control+C' },
      { label: 'Paste', click: () => store.dispatch(paste()), accelerator: 'Control+V' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { label: 'Toggle Speaker Names', click: () => store.dispatch(toggleDisplaySpeakerNames()) },
      { label: 'Toggle Video', click: () => store.dispatch(toggleDisplayVideo()) },
    ],
  },
];

export const nonEditorMenu: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        click: () => store.dispatch(openDocumentFromDisk()),
        accelerator: 'CommandOrControl+O',
      },
      { label: 'Import & Transcribe', click: () => store.dispatch(transcribeFile()) },
    ],
  },
];
