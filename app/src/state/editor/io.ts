import {
  deserializeDocumentFromFile,
  Document,
  DocumentGenerator,
  DocumentGeneratorItem,
  serializeDocumentToFile,
} from '../../core/document';
import { ipcRenderer } from 'electron';
import { openEditor, openLanding } from '../nav';
import { assertSome } from '../../util';
import * as ffmpeg_exporter from '../../core/ffmpeg';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { editorDefaults, EditorState, NoFileSelectedError } from './types';
import { pause } from './play';

export const saveDocument = createAsyncActionWithReducer<
  EditorState,
  boolean,
  { document: Document; path?: string }
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
      console.log('opening save dialog');
      const path = await ipcRenderer
        .invoke('save-file', {
          title: 'Save file as...',
          properties: ['saveFile'],
          filters: [
            { name: 'Audapolis Project Files', extensions: ['audapolis'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        .then((x) => x.filePath);
      console.log('saving to ', path);
      await serializeDocumentToFile(document, path);
      return { document, path };
    }
  },
  {
    fulfilled: (state, { document, path }) => {
      state.lastSavedDocument = document;
      if (path) state.path = path;
    },
    rejected: (state, payload) => {
      console.log('saving document failed: ', payload);
    },
  }
);

export const closeDocument = createAsyncActionWithReducer<EditorState>(
  'editor/delete',
  async (arg, { dispatch }) => {
    dispatch(pause());
    dispatch(openLanding());
  }
);

export const setState = createActionWithReducer<EditorState, EditorState>(
  'editor/setState',
  (state, newState) => {
    Object.assign(state, newState);
  }
);

export const openDocumentFromDisk = createAsyncActionWithReducer<EditorState>(
  'editor/openDocumentFromDisk',
  async (_, { dispatch }): Promise<void> => {
    const file = await ipcRenderer.invoke('open-file', {
      title: 'Open audapolis document...',
      properties: ['openFile'],
      promptToCreate: true,
      createDirectory: true,
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
      const document = await deserializeDocumentFromFile(path, (noSourceDocument) => {
        dispatch(
          setState({
            path,
            document: noSourceDocument,
            ...editorDefaults,
            lastSavedDocument: noSourceDocument,
          })
        );
      });
      dispatch(
        setState({
          path,
          document,
          ...editorDefaults,
          lastSavedDocument: document,
        })
      );
    } catch (e) {
      dispatch(openLanding());
      throw e;
    }
  },
  {
    rejected: (state, error) => {
      if (error.name == 'NoFileSelectedError') return;
      console.error(`an error occurred while trying to open the file`, error);
      alert(`an error occurred while trying to open the file:\n${error.message}`);
    },
  }
);

export const openDocumentFromMemory = createAsyncActionWithReducer<EditorState, Document>(
  'editor/openDocumentFromMemory',
  async (document, { dispatch }) => {
    await dispatch(openEditor());
    dispatch(
      setState({
        path: null,
        document,
        ...editorDefaults,
      })
    );
  },
  {
    rejected: (state, error) => {
      console.error('an error occurred while trying to load the document from memory', error);
      alert(`an error occurred while trying to open the file:\n${error.message}`);
    },
  }
);

export const exportSelection = createAsyncActionWithReducer<EditorState>(
  'editor/exportSelection',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    const selection = state.selection;
    if (!selection) {
      return;
    }

    const filterFn = (item: DocumentGeneratorItem) =>
      item.absoluteStart >= selection.range.start &&
      item.absoluteStart + item.length <= selection.range.start + selection.range.length;
    const render_items = DocumentGenerator.fromParagraphs(state.document.content)
      .filter(filterFn)
      .toRenderItems()
      .collect();

    const path = await ipcRenderer
      .invoke('save-file', {
        title: 'Export selection',
        properties: ['saveFile'],
        filters: [
          { name: 'mp3 Files', extensions: ['mp3'] },
          { name: 'wav Files', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      .then((x) => x.filePath);
    console.log('exporting to', path);
    await ffmpeg_exporter.exportAudio(render_items, state.document.sources, path);
  }
);
