import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { sleep } from './util';

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

export interface DownoadModelTask {
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
}

export const fetchModelState = createAsyncThunk('models/fetchModelState', async () => {
  const available = await fetch('http://localhost:8000/models/available').then((x) => x.json());
  const downloaded = await fetch('http://localhost:8000/models/downloaded').then((x) => x.json());

  return { available, downloaded };
});

export const downloadModel = createAsyncThunk<void, Model>(
  'models/downloadModel',
  async (model, { dispatch }) => {
    const { uuid } = await fetch(
      `http://localhost:8000/tasks/download_model/` +
        `?lang=${encodeURIComponent(model.lang)}` +
        `&model=${encodeURIComponent(model.name)}`,
      { method: 'POST' }
    ).then((x) => x.json());

    while (true) {
      const { state, processed, total } = (await fetch(`http://localhost:8000/tasks/${uuid}/`).then(
        (x) => x.json()
      )) as DownoadModelTask;
      dispatch(setProgress({ model, state, progress: processed / total }));
      if (state == DownloadingModelState.DONE) {
        dispatch(setProgress({ model, state, progress: processed / total }));
        dispatch(fetchModelState());
        break;
      }
      await sleep(100);
    }
  }
);

export const deleteModel = createAsyncThunk<void, Model>(
  'models/downloadModel',
  async (model, { dispatch }) => {
    await fetch(
      `http://localhost:8000/models/delete/` +
        `?lang=${encodeURIComponent(model.lang)}` +
        `&model=${encodeURIComponent(model.name)}`,
      { method: 'POST' }
    );
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
  },
  extraReducers: (builder) => {
    builder.addCase(fetchModelState.fulfilled, (state, action) => {
      return { ...state, ...action.payload };
    });
  },
});

export const { setProgress } = modelsSlice.actions;
export default modelsSlice.reducer;
