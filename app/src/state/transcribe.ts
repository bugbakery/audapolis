import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { openTranscribe, openLanding, openTranscribing, openModelManager } from './nav';
import { RootState } from './index';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { sleep } from '../util';
import { openDocumentFromMemory } from './editor';
import { Paragraph } from '../core/document';
import { fetchModelState, Model } from './models';
import { getAuthHeader, getServer, getServerName } from './server';
import { createHash } from 'crypto';
import { convertToWav } from '../core/ffmpeg';
export interface TranscribeState {
  file?: string;
  processed: number;
  total: number;
  state?: TranscriptionState;
}

export enum TranscriptionState {
  QUEUED = 'queued',
  LOADING = 'loading',
  TRANSCRIBING = 'transcribing',
  POST_PROCESSING = 'post_processing',
  DONE = 'done',
}
export interface Task {
  uuid: string;
  filename: string;
  state: TranscriptionState;
  total: number;
  processed: number;
  content?: Record<any, any>;
}

export const transcribeFile = createAsyncThunk<string, void, { state: RootState }>(
  'transcribe/transcribeFile',
  async (_, { dispatch, getState }) => {
    await dispatch(fetchModelState()).unwrap();
    if (Object.keys(getState().models.downloaded).length == 0) {
      await dispatch(openModelManager()).unwrap();
      alert('Please download a transcription model first!');
      return;
    }
    const file = await ipcRenderer.invoke('open-file', {
      title: 'Import media file...',
      properties: ['openFile'],
      promptToCreate: true,
      createDirectory: true,
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (file.canceled) {
      return;
    }
    dispatch(openTranscribe());
    return file.filePaths[0];
  }
);

export const abortTranscription = createAsyncThunk('transcribe/abort', async (_, { dispatch }) => {
  dispatch(openLanding());
});

export const startTranscription = createAsyncThunk<
  void,
  { model: Model; diarize: boolean },
  { state: RootState }
>('transcribing/upload', async ({ model, diarize }, { dispatch, getState }) => {
  const formData = new FormData();
  const state = getState();
  const server = getServer(state);
  const serverName = getServerName(server);
  const path = state?.transcribe?.file;
  if (path === undefined) {
    throw Error('Failed to start transcription: No file for transcription given.');
  }
  dispatch(openTranscribing());
  const fileName = basename(path);
  const wavFileContent = await convertToWav(path);
  const file = new File([wavFileContent], 'input.wav');
  formData.append('file', file); // TODO: Error handling
  formData.append('fileName', fileName);
  const result = (await fetch(
    `${serverName}/tasks/start_transcription/` +
      `?lang=${encodeURIComponent(model.lang)}` +
      `&model=${encodeURIComponent(model.name)}` +
      `&diarize=${diarize}`,
    {
      method: 'POST',
      body: formData,
      headers: { Authorization: getAuthHeader(server) },
    }
  ).then((x) => x.json())) as Task;
  dispatch(setState(result.state));
  const { uuid } = result;
  while (true) {
    const { content, state, processed, total } = (await fetch(`${serverName}/tasks/${uuid}/`, {
      headers: { Authorization: getAuthHeader(server) },
    }).then((x) => x.json())) as Task;
    dispatch(setProgress({ processed, total }));
    dispatch(setState(state));
    if (state == TranscriptionState.DONE) {
      const fileContent = readFileSync(path);
      const fileContents = fileContent.buffer;
      const objectUrl = URL.createObjectURL(new Blob([fileContents]));
      const hash = createHash('sha256');
      hash.update(fileContent.slice(0));
      const hashValue = hash.digest('hex');
      const sources = {
        [hashValue]: {
          fileName,
          fileContents,
          objectUrl,
        },
      };
      if (content === undefined) {
        throw Error('Transcription failed: State is done, but no content was produced');
      }
      // TODO: proper typing
      const contentWithSource = content.map((paragraph: any) => {
        paragraph.content = paragraph.content.map((word: any) => {
          word['source'] = hashValue;
          return word;
        });
        return paragraph;
      });
      dispatch(
        openDocumentFromMemory({ sources: sources, content: contentWithSource as Paragraph[] })
      );
      // Once the task is finished, try to delete it but ignore any errors
      fetch(`${serverName}/tasks/${uuid}/`, {
        headers: { Authorization: getAuthHeader(server) },
        method: 'DELETE',
      });
      break;
    }
    await sleep(0.1);
  }
});

export const importSlice = createSlice({
  name: 'nav',
  initialState: { processed: 0, total: 1 } as TranscribeState,
  reducers: {
    setState: (state, args: PayloadAction<TranscriptionState>) => {
      state.state = args.payload;
    },
    setProgress: (state, args: PayloadAction<{ total: number; processed: number }>) => {
      state.processed = args.payload.processed;
      state.total = args.payload.total;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(transcribeFile.fulfilled, (state, action) => {
      state.file = action.payload;
    });
  },
});
const { setState, setProgress } = importSlice.actions;
export default importSlice.reducer;
