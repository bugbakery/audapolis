import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchModelState } from './models';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
  Settings,
}
export interface NavState {
  page: Page;
}

export const openSettings = createAsyncThunk('nav/openSettings', async (_, { dispatch }) => {
  dispatch(fetchModelState());
});

export const navSlice = createSlice({
  name: 'nav',
  initialState: {
    page: Page.Landing,
  },
  reducers: {
    openTranscribe: (state) => {
      state.page = Page.Transcribe;
    },
    openEditor: (state) => {
      state.page = Page.Editor;
    },
    openLanding: (state) => {
      state.page = Page.Landing;
    },
    openTranscribing: (state) => {
      state.page = Page.Transcribing;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openSettings.fulfilled, (state) => {
      state.page = Page.Settings;
    });
  },
});

export const { openTranscribe, openEditor, openLanding, openTranscribing } = navSlice.actions;
export default navSlice.reducer;
