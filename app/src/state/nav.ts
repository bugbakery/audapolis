import { createSlice } from '@reduxjs/toolkit';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
}
export interface NavState {
  page: Page;
}

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
});

export const { openTranscribe, openEditor, openLanding, openTranscribing } = navSlice.actions;
export default navSlice.reducer;
