import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { openLanding, openModelManager, openTranscribe, openTranscribing } from './nav';
import { RootState } from './index';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { sleep } from '../util';
import { DocumentItem } from '../core/document';
import { fetchModelState, Model } from './models';
import { getServer } from './server';
import { createHash } from 'crypto';
import { convertToWav } from '../core/ffmpeg';
import {
  deleteTask,
  getTask,
  startTranscription as startTranscriptionApiCall,
  TranscriptionState,
} from '../server_api/api';
import { openFile } from '../../ipc/ipc_renderer';
import { openDocumentFromMemory } from './editor/io';

export interface TranscribeState {
  file?: string;
  progress: number;
  state?: TranscriptionState;
}

export const transcribeFile = createAsyncThunk<string | undefined, void, { state: RootState }>(
  'transcribe/transcribeFile',
  async (_, { dispatch, getState }) => {
    await dispatch(fetchModelState()).unwrap();
    if (Object.keys(getState().models.downloaded).length == 0) {
      await dispatch(openModelManager()).unwrap();
      alert('Please download a transcription model first!');
      return;
    }
    const file = await openFile({
      title: 'Import media file...',
      properties: ['openFile', 'promptToCreate', 'createDirectory'],
      filters: [
        {
          name: 'Audio & Video Files',
          extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac', 'mp4', 'mkv', 'mov'],
        },
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

export const startTranscription = createAsyncThunk<
  void,
  { model: Model; diarize: boolean; diarize_max_speakers: number },
  { state: RootState }
>(
  'transcribing/upload',
  async ({ model, diarize, diarize_max_speakers }, { dispatch, getState }) => {
    const state = getState();
    const server = getServer(state);
    const path = state?.transcribe?.file;
    if (path === undefined) {
      throw Error('Failed to start transcription: No file for transcription given.');
    }
    dispatch(openTranscribing());

    dispatch(setProgress(0));
    dispatch(setState(TranscriptionState.CONVERTING));

    const fileName = basename(path);
    let wavFileContent;
    try {
      wavFileContent = await convertToWav(path, (p) => dispatch(setProgress(p)));
    } catch (err) {
      alert(err);
      dispatch(openLanding());
      return;
    }

    const file = new File([wavFileContent], 'input.wav');
    const task = await startTranscriptionApiCall(
      server,
      model.lang,
      model.name,
      diarize,
      diarize_max_speakers,
      file,
      fileName
    );

    dispatch(setState(task.state));

    while (true) {
      const { content, state, progress } = await getTask(server, task);

      dispatch(setProgress(progress));
      dispatch(setState(state));

      if (state == 'done') {
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

        const flatContent: DocumentItem[] = [];
        for (const para of content) {
          flatContent.push(
            { type: 'paragraph_break', speaker: para.speaker },
            ...para.content.map((word: any) => {
              word['source'] = hashValue;
              return word;
            })
          );
        }
        dispatch(openDocumentFromMemory({ sources: sources, content: flatContent }));
        // Once the task is finished, try to delete it but ignore any errors
        await deleteTask(server, task);
        break;
      }
      await sleep(0.1);
    }
  }
);

export const importSlice = createSlice({
  name: 'nav',
  initialState: { progress: 0 } as TranscribeState,
  reducers: {
    setState: (state, args: PayloadAction<TranscriptionState>) => {
      state.state = args.payload;
    },
    setProgress: (state, args: PayloadAction<number>) => {
      state.progress = args.payload;
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
