import { ipcRenderer } from 'electron';
import { store } from '../state';
import {
  closeDocument,
  copy,
  cut,
  openDocumentFromDisk,
  paste,
  saveDocument,
} from '../state/editor';
import { transcribeFile } from '../state/transcribe';
import { ActionCreators } from 'redux-undo';
import { v4 as uuidv4 } from 'uuid';

function dispatchMenuItem(
  label: string,
  action: Parameters<typeof store.dispatch>[0],
  accelerator?: string
) {
  const uuid = `menu/${uuidv4()}`;

  ipcRenderer.on(uuid, () => {
    console.log(action);
    store.dispatch(action);
  });

  return {
    label: label,
    accelerator: accelerator,
    click: uuid,
  };
}

export const editorMenu = [
  {
    label: 'File',
    submenu: [
      dispatchMenuItem('Open', openDocumentFromDisk(), 'CommandOrControl+O'),
      dispatchMenuItem('Import & Transcribe', transcribeFile()),
      { type: 'separator' },
      dispatchMenuItem('Save', saveDocument(false), 'CommandOrControl+S'),
      dispatchMenuItem('Save As', saveDocument(true), 'CommandOrControl+Shift+S'),
      { type: 'separator' },
      dispatchMenuItem('Close Document', closeDocument(), 'CommandOrControl+Shift+W'),
    ],
  },
  {
    label: 'Edit',
    submenu: [
      dispatchMenuItem('Undo', ActionCreators.undo, 'CommandOrControl+Z'),
      dispatchMenuItem('Redo', ActionCreators.redo, 'CommandOrControl+Shift+Z, CommandOrControl+Y'),
      { type: 'separator' },
      dispatchMenuItem('Cut', cut(), 'CommandOrControl+X'),
      dispatchMenuItem('Copy', copy(), 'CommandOrControl+C'),
      dispatchMenuItem('Paste', paste(), 'CommandOrControl+V'),
    ],
  },
];

export const nonEditorMenu = [
  {
    label: 'File',
    submenu: [
      dispatchMenuItem('Open', openDocumentFromDisk(), 'CommandOrControl+O'),
      dispatchMenuItem('Import & Transcribe', transcribeFile()),
    ],
  },
];
