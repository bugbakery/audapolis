import { createActionWithReducer } from '../util';
import { EditorState } from './types';

export const toggleDisplaySpeakerNames = createActionWithReducer<EditorState>(
  'editor/toggleDisplaySpeakerNames',
  (state) => {
    state.displaySpeakerNames = !state.displaySpeakerNames;
  }
);

export const toggleDisplayVideo = createActionWithReducer<EditorState>(
  'editor/toggleDisplayVideo',
  (state) => {
    state.displayVideo = !state.displayVideo;
  }
);

export const setExportPopup = createActionWithReducer<EditorState, boolean>(
  'editor/setExportPopup',
  (state, payload) => {
    state.exportPopup = payload;
  }
);
