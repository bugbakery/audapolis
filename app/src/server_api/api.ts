import { fetchFromServer } from './index';
import { ServerConfig } from '../state/server';
import { Model } from '../state/models';
import { Paragraph, ParagraphItem } from '../core/document';

export interface Task {
  uuid: string;
}

export enum TranscriptionState {
  QUEUED = 'queued',
  LOADING = 'loading',
  TRANSCRIBING = 'transcribing',
  POST_PROCESSING = 'post_processing',
  DONE = 'done',
}

export interface TranscriptionTask extends Task {
  processed: number;
  total: number;
  state: TranscriptionState;
  content?: Paragraph<Omit<ParagraphItem, 'source'>>[];
}

export enum DownloadingModelState {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  EXTRACTING = 'extracting',
  DONE = 'done',
}

export interface DownloadModelTask extends Task {
  lang: string;
  name: string;
  state: DownloadingModelState;
  total: number;
  processed: number;
}

export function startTranscription(
  server: ServerConfig,
  lang: string,
  model: string,
  diarize: boolean,
  file: File,
  fileName: string
): Promise<TranscriptionTask> {
  return fetchFromServer(
    server,
    'POST',
    'tasks/start_transcription',
    { lang, model, diarize },
    { form: { file, fileName } }
  ).then((x) => x.json());
}

export function downloadModel(
  server: ServerConfig,
  lang: string,
  model: string
): Promise<DownloadModelTask> {
  return fetchFromServer(server, 'POST', 'tasks/download_model', { lang, model }).then((x) =>
    x.json()
  );
}

export function getTask<T extends Task>(server: ServerConfig, task: T): Promise<T> {
  return fetchFromServer(server, 'GET', `tasks/${task.uuid}`).then((x) => x.json());
}

export function deleteTask(server: ServerConfig, task: Task): Promise<void> {
  return fetchFromServer(server, 'DELETE', `tasks/${task.uuid}`).then(() => {});
}

export function deleteModel(server: ServerConfig, lang: string, model: string): Promise<void> {
  return fetchFromServer(server, 'POST', 'models/delete', { lang, model }).then(() => {});
}

export function getAvailableModels(server: ServerConfig): Promise<Record<string, Model>> {
  return fetchFromServer(server, 'GET', 'models/available').then((x) => x.json());
}

export function getDownloadedModels(server: ServerConfig): Promise<Record<string, Model>> {
  return fetchFromServer(server, 'GET', 'models/downloaded').then((x) => x.json());
}

export interface OtioSegment {
  speaker: string;
  source_file: string;
  source_length: number;
  has_video: boolean;
  source_start: number;
  length: number;
}

export function convertOtio(
  server: ServerConfig,
  name: string,
  adapter: string,
  timeline: OtioSegment[]
): Promise<ArrayBuffer> {
  return fetchFromServer(
    server,
    'POST',
    'util/otio/convert',
    { name, adapter },
    { json: timeline }
  ).then((x) => x.arrayBuffer());
}
