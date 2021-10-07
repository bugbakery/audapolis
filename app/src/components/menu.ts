import { ipcRenderer } from 'electron';
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

function menuItem(
  label: string,
  fn: (dispatch: typeof store.dispatch) => void,
  accelerator?: string
) {
  const uuid = `menu/${uuidv4()}`;

  ipcRenderer.on(uuid, () => {
    fn(store.dispatch);
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
      menuItem('Open', (dispatch) => dispatch(openDocumentFromDisk()), 'CommandOrControl+O'),
      menuItem('Import & Transcribe', (dispatch) => dispatch(transcribeFile())),
      { type: 'separator' },
      menuItem('Save', (dispatch) => dispatch(saveDocument(false)), 'CommandOrControl+S'),
      menuItem('Save As', (dispatch) => dispatch(saveDocument(true)), 'CommandOrControl+Shift+S'),
      { type: 'separator' },
      menuItem('Close Document', (dispatch) => dispatch(closeDocument()), 'CommandOrControl+Shift+W'),
    ],
  },
  {
    label: 'Edit',
    submenu: [
      menuItem('Undo', (dispatch) => dispatch(ActionCreators.undo()), 'CommandOrControl+Z'),
      menuItem(
        'Redo',
        (dispatch) => dispatch(ActionCreators.redo()),
        'CommandOrControl+Shift+Z, CommandOrControl+Y'
      ),
      { type: 'separator' },
      menuItem('Cut', (dispatch) => dispatch(cut()), 'CommandOrControl+X'),
      menuItem('Copy', (dispatch) => dispatch(copy()), 'CommandOrControl+C'),
      menuItem('Paste', (dispatch) => dispatch(paste()), 'CommandOrControl+V'),
    ],
  },
  {
    label: 'View',
    submenu: [
      menuItem('Toggle Speaker Names', (dispatch) => dispatch(toggleDisplaySpeakerNames())),
      menuItem('Toggle Video', (dispatch) => dispatch(toggleDisplayVideo())),
    ],
  },
];

export const nonEditorMenu = [
  {
    label: 'File',
    submenu: [
      menuItem('Open', (dispatch) => dispatch(openDocumentFromDisk()), 'CommandOrControl+O'),
      menuItem('Import & Transcribe', (dispatch) => dispatch(transcribeFile())),
    ],
  },
];
