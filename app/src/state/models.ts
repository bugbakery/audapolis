import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { assertSome, sleep } from '../util';
import { RootState } from './index';
import { getAuthHeader, getServerName, ServerConfig } from './server';

export interface Model {
  lang: string;
  name: string;
  url: string;
  description: string;
  size: string;
  wer_speed: string;
}

export enum DownloadingModelState {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  EXTRACTING = 'extracting',
  DONE = 'done',
}

export type DownloadingModel = Model & {
  progress: number;
  state: DownloadingModelState;
};

export interface DownloadModelTask {
  lang: string;
  name: string;
  state: DownloadingModelState;
  total: number;
  processed: number;
}

export interface ModelsState {
  downloaded: Record<string, Model[]>;
  available: Record<string, Model[]>;
  downloading: DownloadingModel[];
  server?: ServerConfig;
}

export const fetchModelState = createAsyncThunk<
  { downloaded: Record<string, Model[]>; available: Record<string, Model[]> },
  void,
  { state: RootState }
>('models/fetchModelState', async (_, { getState }) => {
  const server = getState().models.server;
  assertSome(server);
  const available = await fetch(`${getServerName(server)}/models/available`, {
    headers: { Authorization: getAuthHeader(server) },
  }).then((x) => x.json());
  const downloaded = await fetch(`${getServerName(server)}/models/downloaded`, {
    headers: { Authorization: getAuthHeader(server) },
  }).then((x) => x.json());

  return { available, downloaded };
});

export const downloadModel = createAsyncThunk<void, Model, { state: RootState }>(
  'models/downloadModel',
  async (model, { dispatch, getState }) => {
    const server = getState().models.server;
    assertSome(server);
    const { uuid } = await fetch(
      `${getServerName(server)}/tasks/download_model/` +
        `?lang=${encodeURIComponent(model.lang)}` +
        `&model=${encodeURIComponent(model.name)}`,
      { method: 'POST', headers: { Authorization: getAuthHeader(server) } }
    ).then((x) => x.json());

    while (true) {
      const { state, processed, total } = (await fetch(`${getServerName(server)}/tasks/${uuid}/`, {
        headers: { Authorization: getAuthHeader(server) },
      }).then((x) => x.json())) as DownloadModelTask;
      dispatch(setProgress({ model, state, progress: processed / total }));
      if (state == DownloadingModelState.DONE) {
        dispatch(setProgress({ model, state, progress: processed / total }));
        dispatch(fetchModelState());
        break;
      }
      await sleep(0.1);
    }
  }
);

export const deleteModel = createAsyncThunk<void, Model, { state: RootState }>(
  'models/downloadModel',
  async (model, { dispatch, getState }) => {
    const server = getState().models.server;
    assertSome(server);
    await fetch(
      `${getServerName(server)}/models/delete/` +
        `?lang=${encodeURIComponent(model.lang)}` +
        `&model=${encodeURIComponent(model.name)}`,
      { method: 'POST', headers: { Authorization: getAuthHeader(server) } }
    );
    dispatch(fetchModelState());
  }
);

export const changeServer = createAsyncThunk<void, ServerConfig, { state: RootState }>(
  'models/changeServer',
  async (server, { dispatch }) => {
    await dispatch(setServer(server));
    dispatch(fetchModelState());
  }
);

export const modelsSlice = createSlice({
  name: 'models',
  initialState: {
    downloaded: {},
    available: {},
    downloading: [],
  } as ModelsState,
  reducers: {
    setProgress: (
      slice,
      payload: PayloadAction<{ model: Model; progress: number; state: DownloadingModelState }>
    ) => {
      const { progress, state, model } = payload.payload;

      if (state == DownloadingModelState.DONE) {
        slice.downloading = slice.downloading.filter(
          (x) => !(x.lang == model.lang && x.name == model.name)
        );
        return;
      }

      const newDownloadingRow = { progress, state, ...model };
      const idx = slice.downloading.findIndex((x) => x.lang == model.lang && x.name == model.name);
      if (idx === -1) {
        slice.downloading.push(newDownloadingRow);
      } else {
        slice.downloading[idx] = newDownloadingRow;
      }
    },
    setServer: (slice, payload: PayloadAction<ServerConfig>) => {
      slice.server = payload.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchModelState.fulfilled, (state, action) => {
      return { ...state, ...action.payload };
    });
  },
});

export const { setProgress, setServer } = modelsSlice.actions;
export default modelsSlice.reducer;
