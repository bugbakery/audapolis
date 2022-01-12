import { assertSome } from '../../util';
import { DocumentGenerator, getItemsAtTime } from '../../core/document';
import { createActionWithReducer } from '../util';
import { EditorState } from './types';

export const setPlayerTime = createActionWithReducer<EditorState, number>(
  'editor/setTimePlayer',
  (state, newTime) => {
    state.currentTimePlayer = newTime;
  }
);

export const setUserSetTime = createActionWithReducer<EditorState, number>(
  'editor/setTimeUserSet',
  (state, newTime) => {
    state.currentTimeUserSet = newTime;
  }
);

export const setPlay = createActionWithReducer<EditorState, boolean>(
  'editor/setPlay',
  (state, payload) => {
    state.playing = payload;
  }
);

export const togglePlaying = createActionWithReducer<EditorState>(
  'editor/togglePlaying',
  (state) => {
    state.playing = !state.playing;
  }
);

export const goLeft = createActionWithReducer<EditorState>('editor/goLeft', (state) => {
  const item = getItemsAtTime(
    DocumentGenerator.fromParagraphs(state.document.content),
    state.currentTimePlayer
  )[0];
  assertSome(item);
  state.currentTimeUserSet = item.absoluteStart;
  state.selection = null;
});

export const goRight = createActionWithReducer<EditorState>('editor/goRight', (state) => {
  const items = getItemsAtTime(
    DocumentGenerator.fromParagraphs(state.document.content),
    state.currentTimePlayer
  );
  const item = items[items.length - 1];
  state.currentTimeUserSet = item.absoluteStart + item.length;
  state.selection = null;
});
