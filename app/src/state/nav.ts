import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchModelState } from './models';
import { RootState, store } from './index';
import { subscribeOpenAbout } from '../../ipc/ipc_renderer';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
  ModelManager,
  About,
}
export interface NavState {
  page: Page;
}

export const openModelManager = createAsyncThunk<void, void, { state: RootState }>(
  'nav/openModelManager',
  async (server, { dispatch }) => {
    dispatch(fetchModelState());
  }
);

export const openTranscribe = createAsyncThunk<void, void, { state: RootState }>(
  'nav/openTranscribe',
  async (_, { dispatch }) => {
    dispatch(fetchModelState());
  }
);

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
    openAbout: (state) => {
      state.page = Page.About;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openModelManager.fulfilled, (state) => {
      state.page = Page.ModelManager;
    });
    builder.addCase(openTranscribe.pending, (state) => {
      state.page = Page.Transcribe;
    });
  },
});

export const { openEditor, openLanding, openTranscribing, openAbout } = navSlice.actions;
export default navSlice.reducer;

subscribeOpenAbout(() => {
  store.dispatch(openAbout());
});
