import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { openTranscribe, openLanding, openTranscribing } from './nav';
import { RootState } from './index';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { sleep } from './util';
import { openDocumentFromMemory } from './editor';
import { Paragraph } from '../core/document';
import { ctx } from '../core/webaudio';

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

export const transcribeFile = createAsyncThunk(
  'transcribe/transcribeFile',
  async (_, { dispatch }) => {
    const file = await ipcRenderer.invoke('open-file', {
      properties: ['openFile'],
      promptToCreate: true,
      createDirectory: true,
      filters: [
        { name: 'Audio Files', extensions: ['wav', 'mp3'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    dispatch(openTranscribe());
    return file.filePaths[0];
  }
);

export const abortTranscription = createAsyncThunk('transcribe/abort', async (_, { dispatch }) => {
  dispatch(openLanding());
});

export const startTranscription = createAsyncThunk<void, void, { state: RootState }>(
  'transcribing/upload',
  async (_, { dispatch, getState }) => {
    const formData = new FormData();
    const state = getState();
    const path = state?.transcribe?.file;
    if (path === undefined) {
      throw Error('Failed to start transcription: No file for transcription given.');
    }
    const fileContent = readFileSync(path);
    const fileName = basename(path);
    const file = new File([fileContent], fileName);
    formData.append('file', file); // TODO: Error handling
    dispatch(openTranscribing());
    const result = (await fetch(
      'http://localhost:8000/tasks/start_transcription/?lang=German&model=small',
      { method: 'POST', body: formData }
    ).then((x) => x.json())) as Task;
    dispatch(setState(result.state));
    const { uuid } = result;
    while (true) {
      const { content, state, processed, total } = (await fetch(
        `http://localhost:8000/tasks/${uuid}/`
      ).then((x) => x.json())) as Task;
      dispatch(setProgress({ processed, total }));
      dispatch(setState(state));
      if (state == TranscriptionState.DONE) {
        const fileContents = fileContent.buffer;
        const decoded = await ctx.decodeAudioData(fileContents.slice(0));
        const sources = [
          {
            fileName,
            fileContents,
            decoded,
          },
        ];
        if (content === undefined) {
          throw Error('Transcription failed: State is done, but no content was produced');
        }
        // TODO: proper typing
        const contentWithSource = content.map((paragraph: any) => {
          paragraph.content = paragraph.content.map((word: any) => {
            word['source'] = 0;
            return word;
          });
          return paragraph;
        });
        dispatch(
          openDocumentFromMemory({ sources: sources, content: contentWithSource as Paragraph[] })
        );
        break;
      }
      await sleep(100);
    }
  }
);

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
