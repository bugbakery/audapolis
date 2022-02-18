import { createActionWithReducer } from '../util';
import { EditorState, ExportPopupState } from './types';

export const toggleDisplaySpeakerNames = createActionWithReducer<EditorState>(
  'editor/toggleDisplaySpeakerNames',
  (state) => {
    state.displaySpeakerNames = !state.displaySpeakerNames;
  }
);

export const setDisplaySpeakerNames = createActionWithReducer<EditorState, boolean>(
  'editor/setDisplaySpeakerNames',
  (state, payload) => {
    state.displaySpeakerNames = payload;
  }
);

export const toggleDisplayVideo = createActionWithReducer<EditorState>(
  'editor/toggleDisplayVideo',
  (state) => {
    state.displayVideo = !state.displayVideo;
  }
);

export const setExportPopup = createActionWithReducer<EditorState, ExportPopupState>(
  'editor/setExportPopup',
  (state, payload) => {
    state.exportPopup = payload;
  }
);

export const setExportState = createActionWithReducer<
  EditorState,
  { running: boolean; progress: number }
>('editor/setExportState', (state, exportState) => {
  state.exportState = exportState;
});
