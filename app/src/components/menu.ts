import { MenuItemConstructorOptions } from 'electron';
import { store } from '../state';
import { transcribeFile } from '../state/transcribe';
import { ActionCreators } from 'redux-undo';
import { v4 as uuidv4 } from 'uuid';
import { MenuItemConstructorOptionsIpc } from '../../main_process/types';
import { closeDocument, openDocumentFromDisk, saveDocument } from '../state/editor/io';
import { copy, cut, paste } from '../state/editor/edit';
import { selectAll } from '../state/editor/selection';
import { toggleDisplaySpeakerNames, toggleDisplayVideo } from '../state/editor/display';
import {
  subscribeMenuClick,
  unsubscribeAllMenuClick,
  setMenu as setMenuIpc,
} from '../../ipc/ipc_renderer';

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

  unsubscribeAllMenuClick();
  subscribeMenuClick((uuid) => {
    listeners[uuid]();
  });
  setMenuIpc(transformed);
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
      { label: 'Cut', click: () => store.dispatch(cut()), accelerator: 'CommandOrControl+X' },
      { label: 'Copy', click: () => store.dispatch(copy()), accelerator: 'CommandOrControl+C' },
      { label: 'Paste', click: () => store.dispatch(paste()), accelerator: 'CommandOrControl+V' },
      { type: 'separator' },
      {
        label: 'Select All',
        click: () => store.dispatch(selectAll()),
        accelerator: 'CommandOrControl+A',
      },
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
