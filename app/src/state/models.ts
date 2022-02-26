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
  type: 'transcription' | 'punctuation';
  model_id: string;
}

export interface Language {
  lang: string;
  transcription_models: Model[];
  punctuation_models: Model[];
}

export type DownloadingModel = Model & {
  progress: number;
  task_uuid: string;
  state: DownloadingModelState;
};

export interface ModelsState {
  downloaded: Record<string, Model>;
  downloading: DownloadingModel[];
  all: Model[];
  languages: Record<string, Language>;
  selectedLanguage: string | null;
}

export const fetchModelState = createAsyncThunk<
  { downloaded: Record<string, Model>; all: Model[] },
  void,
  { state: RootState }
>('models/fetchModelState', async (_, { getState }) => {
  const server = getServer(getState());
  assertSome(server);
  const all = await getAvailableModels(server);
  const downloaded = await getDownloadedModels(server);

  const flattenLanguages = (x: Record<string, Language>) =>
    Object.values(x).flatMap((x) => {
      return x.transcription_models.concat(x.punctuation_models);
    });

  return { all: flattenLanguages(all), downloaded: downloaded, languages: all };
});

export const downloadModel = createAsyncThunk<void, Model, { state: RootState }>(
  'models/downloadModel',
  async (model, { dispatch, getState }) => {
    const server = getServer(getState());
    assertSome(server);
    const task = await downloadModelApiCall(server, model.model_id);

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
  'models/deleteModel',
  async (model, { dispatch, getState }) => {
    const server = getServer(getState());
    assertSome(server);
    await deleteModelApiCall(server, model.model_id);
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
export function setDefaultModel(lang: string, type: string, model_id: string): void {
  localStorage.setItem(`model-defaults/${lang}/${type}`, model_id);
}

export function getDefaultModel(lang: string, type: string): string | null {
  return localStorage.getItem(`model-defaults/${lang}/${type}`);
}

export const modelsSlice = createSlice({
  name: 'models',
  initialState: {
    downloaded: {},
    downloading: [],
    all: [],
    languages: {},
    selectedLanguage: null,
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
        slice.downloading = slice.downloading.filter((x) => !(x.model_id == model.model_id));
        return;
      }

      const newDownloadingRow = { progress, state, task_uuid, ...model };
      const idx = slice.downloading.findIndex((x) => x.model_id == model.model_id);
      if (idx === -1) {
        slice.downloading.push(newDownloadingRow);
      } else {
        slice.downloading[idx] = newDownloadingRow;
      }
    },
    setLanguage: (slice, payload: PayloadAction<string>) => {
      slice.selectedLanguage = payload.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchModelState.fulfilled, (state, action) => {
      return { ...state, ...action.payload };
    });
    builder.addCase(fetchModelState.rejected, (state, action) => {
      console.error('something went wrong while fetching the model state', action.error);
      alert(
        `something went wrong while communicating with the transcription server:\n${action.error.message}`
      );
    });
    builder.addCase(cancelDownload.fulfilled, (state, action) => {
      state.downloading = state.downloading.filter((x) => !(x.task_uuid = action.payload));
    });
  },
});

export const { setProgress, setLanguage } = modelsSlice.actions;
export default modelsSlice.reducer;
