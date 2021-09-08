import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { store } from './index';
import { openTranscribe, openLanding } from './nav';

export interface TranscribeState {
  file?: string;
}

export const transcribeFile = createAsyncThunk('transcribe/transcribeFile', async () => {
  const file = await ipcRenderer.invoke('open-file', {
    properties: ['openFile'],
    promptToCreate: true,
    createDirectory: true,
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  store.dispatch(openTranscribe());
  return file.filePaths[0];
});

export const abortTranscription = createAsyncThunk('transcribe/abort', async () => {
  store.dispatch(openLanding());
});

export const importSlice = createSlice({
  name: 'nav',
  initialState: {} as TranscribeState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(transcribeFile.fulfilled, (state, action) => {
      state.file = action.payload;
    });
  },
});
export default importSlice.reducer;
