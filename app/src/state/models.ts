import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { assertSome, sleep } from '../util';
import { RootState } from './index';
import { getServer } from './server';
import {
  getAvailableModels,
  getDownloadedModels,
  downloadModel as downloadModelApiCall,
  deleteModel as deleteModelApiCall,
  getTask,
  DownloadingModelState,
  deleteTask,
} from '../server_api/api';

export interface Model {
  lang: string;
  name: string;
  url: string;
  description: string;
  size: string;
  wer_speed: string;
}

export type DownloadingModel = Model & {
  progress: number;
  task_uuid: string;
  state: DownloadingModelState;
};

export interface ModelsState {
  downloaded: Model[];
  downloading: DownloadingModel[];
  all: Model[];
}

export const fetchModelState = createAsyncThunk<
  { downloaded: Model[]; all: Model[] },
  void,
  { state: RootState }
>('models/fetchModelState', async (_, { getState }) => {
  const server = getServer(getState());
  assertSome(server);
  const all = await getAvailableModels(server);
  const downloaded = await getDownloadedModels(server);

  const flatten = (x: Record<string, Model>) => Object.values(x).flatMap((x) => x);

  return { all: flatten(all), downloaded: flatten(downloaded) };
});

export const downloadModel = createAsyncThunk<void, Model, { state: RootState }>(
  'models/downloadModel',
  async (model, { dispatch, getState }) => {
    const server = getServer(getState());
    assertSome(server);
    const task = await downloadModelApiCall(server, model.lang, model.name);

    while (true) {
      const { state, progress } = await getTask(server, task);

      dispatch(setProgress({ model, state, progress, task_uuid: task.uuid }));
      if (state == DownloadingModelState.DONE) {
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
    const server = getServer(getState());
    assertSome(server);
    await deleteModelApiCall(server, model.lang, model.name);
    dispatch(fetchModelState());
  }
);

export const cancelDownload = createAsyncThunk<string, string, { state: RootState }>(
  'models/downloadModel',
  async (uuid, { dispatch, getState }) => {
    const server = getServer(getState());
    assertSome(server);
    await deleteTask(server, uuid);
    dispatch(fetchModelState());
    return uuid;
  }
);
export const modelsSlice = createSlice({
  name: 'models',
  initialState: {
    downloaded: [],
    downloading: [],
    all: [],
  } as ModelsState,
  reducers: {
    setProgress: (
      slice,
      payload: PayloadAction<{
        model: Model;
        progress: number;
        state: DownloadingModelState;
        task_uuid: string;
      }>
    ) => {
      const { progress, state, model, task_uuid } = payload.payload;

      if (state == DownloadingModelState.DONE) {
        slice.downloading = slice.downloading.filter(
          (x) => !(x.lang == model.lang && x.name == model.name)
        );
        return;
      }

      const newDownloadingRow = { progress, state, task_uuid, ...model };
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
    builder.addCase(fetchModelState.rejected, (state, action) => {
      console.error('something went wrong while fetching the model state', action.error);
      alert(
        `something went wrong while comunicating with the transcription server:\n${action.error.message}`
      );
    });
    builder.addCase(cancelDownload.fulfilled, (state, action) => {
      state.downloading = state.downloading.filter((x) => !(x.task_uuid = action.payload));
    });
  },
});

export const { setProgress } = modelsSlice.actions;
export default modelsSlice.reducer;
