import { Document, emptyDocument, TimedParagraphItem } from '../../core/document';

export interface Range {
  start: number;
  length: number;
}

export enum ExportState {
  NotRunning,
  Running,
}

export interface Selection {
  range: Range;
  startItem: TimedParagraphItem;
}

export interface EditorState {
  path: string | null;
  document: Document;
  lastSavedDocument: Document | null;

  currentTime: number;
  playing: boolean;
  displaySpeakerNames: boolean;
  displayVideo: boolean;

  selection: Selection | null;

  exportState: ExportState;
  exportPopup: boolean;
}

export class NoFileSelectedError extends Error {
  constructor() {
    super();
    this.name = 'NoFileSelectedError';
  }
}

export const editorDefaults: EditorState = {
  path: null,
  document: emptyDocument,
  lastSavedDocument: null,
  exportState: ExportState.NotRunning,

  currentTime: 0,
  playing: false,
  selection: null,

  displaySpeakerNames: false,
  displayVideo: false,
  exportPopup: false,
};
