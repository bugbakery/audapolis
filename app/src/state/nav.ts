import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchModelState } from './models';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
  Settings,
  ServerSettings,
}
export interface NavState {
  page: Page;
}

export const openSettings = createAsyncThunk('nav/openSettings', async (_, { dispatch }) => {
  dispatch(fetchModelState());
});

export const openTranscribe = createAsyncThunk('nav/openTranscribe', async (_, { dispatch }) => {
  dispatch(fetchModelState());
});

export const navSlice = createSlice({
  name: 'nav',
  initialState: {
    page: Page.Landing,
  },
  reducers: {
    openEditor: (state) => {
      state.page = Page.Editor;
    },
    openLanding: (state) => {
      state.page = Page.Landing;
    },
    openTranscribing: (state) => {
      state.page = Page.Transcribing;
    },
    openServerSettings: (state) => {
      state.page = Page.ServerSettings;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openSettings.fulfilled, (state) => {
      state.page = Page.Settings;
    });
    builder.addCase(openTranscribe.fulfilled, (state) => {
      state.page = Page.Transcribe;
    });
  },
});

export const { openEditor, openLanding, openTranscribing, openServerSettings } = navSlice.actions;
export default navSlice.reducer;
