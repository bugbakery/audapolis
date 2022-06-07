import {
  deserializeDocumentFromFile,
  Document,
  serializeDocumentToFile,
  Source,
} from '../../core/document';
import { openEditor, openLanding } from '../nav';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { EditorState, NoFileSelectedError } from './types';
import { setPlay } from './play';
import { getHomePath, openFile, saveFile } from '../../../ipc/ipc_renderer';
import { firstPossibleCursorPosition } from './selectors';
import { ActionCreators } from 'redux-undo';
import path from 'path';

export const saveDocument = createAsyncActionWithReducer<
  EditorState,
  boolean,
  { document: Document; path?: string } | undefined
>(
  'editor/saveDocument',
  async (saveAsNew, { getState }) => {
    const document = getState().editor.present?.document;
    if (document === undefined) {
      throw Error('cant save. document is undefined');
    }
    const state_path = getState().editor.present?.path;
    if (state_path && !saveAsNew) {
      await serializeDocumentToFile(document, state_path);
      return { document };
    } else {
      const savePath = await saveFile({
        title: 'Save file as...',
        properties: ['showOverwriteConfirmation', 'createDirectory'],
        filters: [
          { name: 'Audapolis Project Files', extensions: ['audapolis'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        defaultPath: path.join(await getHomePath(), 'Untitled.audapolis'),
      }).then((x) => x.filePath);
      if (!savePath) return;
      await serializeDocumentToFile(document, savePath);
      return { document, path: savePath };
    }
  },
  {
    fulfilled: (state, payload) => {
      if (!payload) return;
      const { document, path } = payload;
      state.lastSavedDocument = document;
      if (path) state.path = path;
    },
    rejected: (state, err: NodeJS.ErrnoException | Error) => {
      if ('code' in err && err.code == 'ENOSPC') {
        alert('Saving the document failed because your disk is (almost) full.');
      } else {
        alert('Saving the document failed. See the development console for more details.');
      }
      console.log('saving document failed: ', err);
    },
  }
);

export const closeDocument = createAsyncActionWithReducer<EditorState>(
  'editor/closeDocument',
  async (arg, { dispatch }) => {
    dispatch(setPlay(false));
    dispatch(openLanding());
  }
);

export const setSources = createActionWithReducer<EditorState, Record<string, Source>>(
  'editor/setSources',
  (state, sources) => {
    state.document.sources = sources;
  }
);

export const openDocumentFromDisk = createAsyncActionWithReducer<
  EditorState,
  void,
  { document: Document; path: string }
>(
  'editor/openDocumentFromDisk',
  async (_, { dispatch }) => {
    const file = await openFile({
      title: 'Open audapolis document...',
      properties: ['openFile', 'promptToCreate', 'createDirectory'],
      filters: [
        { name: 'Audapolis Project Files', extensions: ['audapolis'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (file.canceled) {
      throw new NoFileSelectedError();
    }
    const path = file.filePaths[0];

    dispatch(openEditor());
    try {
      const doc = await deserializeDocumentFromFile(path, (sources) => {
        dispatch(setSources(sources));
      });
      await dispatch(ActionCreators.clearHistory());
      return { path, document: doc };
    } catch (e) {
      dispatch(openLanding());
      throw e;
    }
  },
  {
    fulfilled: (state, { path, document }) => {
      state.document = document;
      state.path = path;
      state.cursor.current = 'user';
      state.cursor.userIndex = firstPossibleCursorPosition(state.document.content);
    },
    rejected: (state, error) => {
      if (error.name == 'NoFileSelectedError') return;
      console.error(`an error occurred while trying to open the file`, error);
      alert(`an error occurred while trying to open the file:\n${error.message}`);
    },
  }
);

export const openDocumentFromMemory = createAsyncActionWithReducer<EditorState, Document, Document>(
  'editor/openDocumentFromMemory',
  async (document, { dispatch }) => {
    await dispatch(openEditor());
    await dispatch(ActionCreators.clearHistory());
    return document;
  },
  {
    fulfilled: (state, document) => {
      state.cursor.current = 'user';
      state.cursor.userIndex = firstPossibleCursorPosition(state.document.content);
      state.document = document;
    },
  }
);
