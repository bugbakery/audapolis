import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { RootState } from './index';
import { openEditor } from './nav';
import {
  deserializeDocument,
  Document,
  documentIterator,
  serializeDocument,
  skipToTime,
} from '../core/document';
import { player } from '../core/webaudio';
import undoable, { includeAction } from 'redux-undo';

export interface Editor {
  path: string | null;
  document: Document;
  currentTime: number;
  playing: boolean;
  displaySpeakerNames: boolean;
}

function assertEditor(editor: Editor | null): asserts editor is Editor {
  if (editor === null) {
    throw Error('editor is not fully loaded, cant perform action on it');
  }
}

export const openDocumentFromDisk = createAsyncThunk(
  'editor/openDocumentFromDisk',
  async (_, { dispatch }): Promise<Editor> => {
    const path = await ipcRenderer
      .invoke('open-file', {
        properties: ['openFile'],
        promptToCreate: true,
        createDirectory: true,
        filters: [
          { name: 'Audapolis Project Files', extensions: ['audapolis'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      .then((x) => x.filePaths[0]);
    const document = await deserializeDocument(path);

    dispatch(openEditor());
    return { path, document, currentTime: 0, playing: false, displaySpeakerNames: false };
  }
);

export const openDocumentFromMemory = createAsyncThunk<Editor, Document>(
  'editor/openDocumentFromMemory',
  async (document, { dispatch }): Promise<Editor> => {
    dispatch(openEditor());
    return { path: null, document, currentTime: 0, playing: false, displaySpeakerNames: false };
  }
);

export const play = createAsyncThunk<void, void, { state: RootState }>(
  'editor/play',
  async (arg, { getState, dispatch }): Promise<void> => {
    const editor = getState().editor.present;
    assertEditor(editor);
    if (editor.playing) {
      return;
    }
    dispatch(setPlay(true));
    const { document, currentTime } = editor;
    if (document === undefined || currentTime === undefined) {
      throw Error('cant play. document is undefined');
    }
    const progressCallback = (time: number) => dispatch(setTime(time));
    await player.play(document, currentTime, progressCallback);
    dispatch(setPlay(false));
  }
);
export const pause = createAsyncThunk<void, void, { state: RootState }>(
  'editor/pause',
  async (): Promise<void> => {
    player.pause();
  }
);
export const togglePlaying = createAsyncThunk<void, void, { state: RootState }>(
  'editor/togglePlaying',
  async (arg, { dispatch, getState }): Promise<void> => {
    if (getState().editor.present?.playing) {
      dispatch(pause());
    } else {
      dispatch(play());
    }
  }
);

export const saveDocument = createAsyncThunk<void, void, { state: RootState }>(
  'editor/saveDocument',
  async (_, { dispatch, getState }): Promise<void> => {
    const document = getState().editor.present?.document;
    if (document === undefined) {
      throw Error('cant save. document is undefined');
    }
    const state_path = getState().editor.present?.path;
    if (state_path) {
      await serializeDocument(document, state_path);
    } else {
      console.log('opening save dialog');
      const path = await ipcRenderer
        .invoke('save-file', {
          properties: ['saveFile'],
          filters: [
            { name: 'Audapolis Project Files', extensions: ['audapolis'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        .then((x) => x.filePath);
      console.log('saving to ', path);
      dispatch(setPath(path));
      await serializeDocument(document, path);
    }
  }
);

export const importSlice = createSlice({
  name: 'editor',
  initialState: null as Editor | null,
  reducers: {
    setTime: (state, args: PayloadAction<number>) => {
      assertEditor(state);
      state.currentTime = args.payload;
    },
    setPlay: (state, args: PayloadAction<boolean>) => {
      assertEditor(state);
      state.playing = args.payload;
    },
    toggleDisplaySpeakerNames: (state) => {
      assertEditor(state);
      state.displaySpeakerNames = !state.displaySpeakerNames;
    },
    setPath: (state, args: PayloadAction<string>) => {
      assertEditor(state);
      state.path = args.payload;
    },
    goLeft: (state) => {
      assertEditor(state);
      let item = null;
      for (const x of documentIterator(state.document.content)) {
        if (x.absoluteStart >= state.currentTime) {
          break;
        } else {
          item = x;
        }
      }
      if (!item) {
        throw new Error('something went wrong');
      }
      state.currentTime = item.absoluteStart;
    },
    goRight: (state) => {
      assertEditor(state);
      const iter = skipToTime(state.currentTime, documentIterator(state.document.content), true);
      iter.next();
      const item = iter.next().value;
      if (!item) {
        throw new Error('something went wrong');
      }
      state.currentTime = item.absoluteStart;
    },
    insertParagraph: (state) => {
      assertEditor(state);

      const item = skipToTime(
        state.currentTime,
        documentIterator(state.document.content),
        true
      ).next().value;
      if (!item) {
        throw new Error('something went wrong');
      }

      const oldParagraph = state.document.content[item.paragraphIdx];
      const wordsBefore = oldParagraph.content.slice(0, item.itemIdx);
      const wordsAfter = oldParagraph.content.slice(item.itemIdx);

      state.document.content = [
        ...state.document.content.slice(0, item.paragraphIdx),
        { ...oldParagraph, content: wordsBefore },
        { ...oldParagraph, content: wordsAfter },
        ...state.document.content.slice(item.paragraphIdx + 1),
      ];
    },
    deleteAction: (state) => {
      assertEditor(state);

      const item = skipToTime(
        state.currentTime,
        documentIterator(state.document.content),
        true
      ).next().value;
      if (!item) {
        throw new Error('something went wrong');
      }

      console.log(item);

      if (item.itemIdx === 0) {
        // we dont actually want to delete anything but rather merge two paragraphs together
        const prevParagraph = state.document.content[item.paragraphIdx - 1];
        const thisParagraph = state.document.content[item.paragraphIdx];

        if (thisParagraph?.speaker !== prevParagraph?.speaker) {
          throw Error('can only merge paragraphs if speaker is the same');
        }

        state.document.content = [
          ...state.document.content.slice(0, item.paragraphIdx - 1),
          { ...thisParagraph, content: [...prevParagraph.content, ...thisParagraph.content] },
          ...state.document.content.slice(item.paragraphIdx + 1),
        ];
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openDocumentFromDisk.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocumentFromDisk.rejected, (state, action) => {
      console.error('an error occurred while trying to load the file', action.error);
    });
    builder.addCase(openDocumentFromMemory.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocumentFromMemory.rejected, (state, action) => {
      console.error('an error occurred while trying to load the doc from memory', action.error);
    });
    builder.addCase(pause.fulfilled, (state) => {
      assertEditor(state);
      state.playing = false;
    });
  },
});
export const {
  setTime,
  toggleDisplaySpeakerNames,
  setPlay,
  setPath,
  insertParagraph,
  deleteAction,
  goLeft,
  goRight,
} = importSlice.actions;
export default undoable(importSlice.reducer, {
  filter: includeAction([insertParagraph.type, deleteAction.type]),
});
