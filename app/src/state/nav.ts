import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchModelState } from './models';
import { RootState } from './index';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
  ServersList,
  ModelManager,
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
    openServersList: (state) => {
      state.page = Page.ServersList;
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

export const { openEditor, openLanding, openTranscribing, openServersList } = navSlice.actions;
export default navSlice.reducer;
