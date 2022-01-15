import { Document, emptyDocument, TimedParagraphItem } from '../../core/document';

export interface Range {
  start: number;
  length: number;
}

export interface ExportState {
  running: boolean;
  progress: number;
}

export interface Selection {
  range: Range;
  startItem: TimedParagraphItem;
}

export interface EditorState {
  path: string | null;
  document: Document;
  lastSavedDocument: Document | null;

  currentTimePlayer: number; // the current time as set by the player (use this one if you want to read the current time)
  currentTimeUserSet: number; // the current time as set by the user. this is mainly meant for consumption by the player which then transfers the value into the currentTimePlayerField

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
  exportState: { running: false, progress: 0 },

  currentTimePlayer: 0,
  currentTimeUserSet: 0,

  playing: false,
  selection: null,

  displaySpeakerNames: false,
  displayVideo: false,
  exportPopup: false,
};
