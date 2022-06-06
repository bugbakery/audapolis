import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { openLanding, openModelManager, openTranscribe, openTranscribing } from './nav';
import { RootState } from './index';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { sleep } from '../util';
import { V3DocumentItem } from '../core/document';
import { fetchModelState, Model } from './models';
import { getServer } from './server';
import { createHash } from 'crypto';
import { copyToMp4, convertToWav } from '../core/ffmpeg';
import {
  deleteTask,
  getTask,
  startTranscription as startTranscriptionApiCall,
  TranscriptionState,
} from '../server_api/api';
import { openFile } from '../../ipc/ipc_renderer';
import { openDocumentFromMemory } from './editor/io';
import { v4 as uuidv4 } from 'uuid';

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
          extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac', 'mp4', 'mkv', 'mov', 'webm'],
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

function workingExtensions(extension: string): boolean {
  return ['.wav', '.mp4'].indexOf(extension) != -1;
}
export const startTranscription = createAsyncThunk<
  void,
  {
    transcription_model: Model;
    punctuation_model: Model | null;
    diarize: boolean;
    diarize_max_speakers: number | null;
  },
  { state: RootState }
>(
  'transcribing/upload',
  async (
    { transcription_model, punctuation_model, diarize, diarize_max_speakers },
    { dispatch, getState }
  ) => {
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
      if (err.code == 'ENOSPC') {
        alert(
          'The import failed because your disk is (almost) full.\n' +
            'Note: During import, audapolis may need some additional free disk space.'
        );
      } else {
        alert(err);
      }
      dispatch(openLanding());
      return;
    }

    const file = new File([wavFileContent], 'input.wav');
    const task = await startTranscriptionApiCall(
      server,
      transcription_model.model_id,
      punctuation_model !== null ? punctuation_model.model_id : null,
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

        let storedFileContent = fileContent;
        if (!workingExtensions(extname(path))) {
          try {
            storedFileContent = await copyToMp4(path);
          } catch (err) {
            alert(
              'Error: Your file is not in a format that is known to work (.wav or .mp4) and could ' +
                'not be copied to an mp4.\n\nContinue at your own risk.'
            );
          }
        }

        const objectUrl = URL.createObjectURL(new Blob([fileContents]));
        const hash = createHash('sha256');
        hash.update(fileContent.slice(0));
        const hashValue = hash.digest('hex');
        const sources = {
          [hashValue]: {
            fileName,
            fileContents: storedFileContent,
            objectUrl,
          },
        };
        if (content === undefined) {
          throw Error('Transcription failed: State is done, but no content was produced');
        }

        const flatContent: V3DocumentItem[] = [];
        for (const para of content) {
          flatContent.push(
            {
              type: 'paragraph_start',
              speaker: para.speaker,
              language: transcription_model.lang,
              uuid: uuidv4(),
            },
            // todo: proper typing
            ...para.content.map((word: any) => {
              if (word.type == 'word') {
                return {
                  type: 'text',
                  source: hashValue,
                  sourceStart: word.sourceStart,
                  length: word.length,
                  text: word.word,
                  conf: word.conf,
                  uuid: uuidv4(),
                };
              }
              if (word.type == 'silence') {
                word.type = 'non_text';
              }
              word['source'] = hashValue;
              word['uuid'] = uuidv4();
              return word;
            }),
            { type: 'paragraph_break', uuid: uuidv4() }
          );
        }
        dispatch(
          openDocumentFromMemory({
            sources: sources,
            content: flatContent,
            metadata: { display_speaker_names: diarize, display_video: false }, // TODO @pajowu: display_video
          })
        );
        // Once the task is finished, try to delete it but ignore any errors
        await deleteTask(server, task.uuid);
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
