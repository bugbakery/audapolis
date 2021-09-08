import { createSlice } from '@reduxjs/toolkit';

export enum Page {
  Landing,
  Transcribe,
  Editor,
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
  },
});

export const { openTranscribe, openEditor, openLanding } = navSlice.actions;
export default navSlice.reducer;
