import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { RootState, store } from './index';
import { openEditor } from './nav';
import { deserializeDocument, Document } from '../core/document';
import { player } from '../core/webaudio';

export interface Editor {
  path?: string;
  document?: Document;
  currentTime?: number;
  playing?: boolean;
}

export const openDocument = createAsyncThunk('editor/openDocument', async (): Promise<Editor> => {
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

  store.dispatch(openEditor());
  return { path, document };
});

export const play = createAsyncThunk<void, void, { state: RootState }>(
  'editor/play',
  async (arg, thunkAPI): Promise<void> => {
    const { document, currentTime } = thunkAPI.getState().editor;
    const progressCallback = (time: number) => store.dispatch(setTime(time));
    player.play(document, currentTime, progressCallback);
  }
);
export const pause = createAsyncThunk<void, void, { state: RootState }>(
  'editor/pause',
  async (): Promise<void> => {
    player.pause();
  }
);

export const importSlice = createSlice({
  name: 'editor',
  initialState: {} as Editor,
  reducers: {
    setTime: (state, args: PayloadAction<number>) => {
      state.currentTime = args.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openDocument.fulfilled, (state, action) => {
      const payload = action.payload as Editor;
      state.document = payload.document;
      state.path = payload.path;
      state.currentTime = 0;
      state.playing = false;
    });
    builder.addCase(openDocument.rejected, (state, action) => {
      console.error('an error occurred while trying to load the file', action.error);
    });
    builder.addCase(play.pending, (state) => {
      state.playing = true;
    });
    builder.addCase(pause.pending, (state) => {
      state.playing = false;
    });
  },
});
export const { setTime } = importSlice.actions;
export default importSlice.reducer;
