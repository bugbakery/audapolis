import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { RootState } from './index';
import { openEditor } from './nav';
import { deserializeDocument, Document } from '../core/document';
import { player } from '../core/webaudio';

export interface Editor {
  path: string;
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

export const openDocument = createAsyncThunk(
  'editor/openDocument',
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

export const play = createAsyncThunk<void, void, { state: RootState }>(
  'editor/play',
  async (arg, { getState, dispatch }): Promise<void> => {
    const editor = getState().editor;
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
    if (getState().editor?.playing) {
      dispatch(pause());
    } else {
      dispatch(play());
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
  },
  extraReducers: (builder) => {
    builder.addCase(openDocument.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocument.rejected, (state, action) => {
      console.error('an error occurred while trying to load the file', action.error);
    });
    builder.addCase(pause.fulfilled, (state) => {
      assertEditor(state);
      state.playing = false;
    });
  },
});
export const { setTime, setPlay, toggleDisplaySpeakerNames } = importSlice.actions;
export default importSlice.reducer;
