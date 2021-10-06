import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchModelState } from './models';
import { RootState } from './index';

export enum Page {
  Landing,
  Transcribe,
  Editor,
  Transcribing,
  ServersList,
  ManageServer,
}
export interface NavState {
  page: Page;
}

export const openManageServer = createAsyncThunk<void, void, { state: RootState }>(
  'nav/openManageServer',
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
    builder.addCase(openManageServer.fulfilled, (state) => {
      state.page = Page.ManageServer;
    });
    builder.addCase(openTranscribe.pending, (state) => {
      state.page = Page.Transcribe;
    });
  },
});

export const { openEditor, openLanding, openTranscribing, openServersList } = navSlice.actions;
export default navSlice.reducer;
