import { assertSome, EPSILON } from '../../util';
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

    // we also set the player time here (instead of in the player) because this way we cannot come into an
    // inconsistent state when fast events are fired (e.g. key repeat of the backspace key)
    state.currentTimePlayer = newTime;
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
  const items = getItemsAtTime(
    DocumentGenerator.fromParagraphs(state.document.content),
    state.currentTimePlayer
  );
  const firstItem = items[0];
  const secondItem = items[items.length - 1];
  assertSome(firstItem);
  assertSome(secondItem);

  // if we are at the beginning of a paragraph, we should put the cursor at the end of the previous paragraph
  if (items.length == 2 && secondItem.firstInParagraph) {
    setUserSetTime.reducer(state, firstItem.absoluteStart + firstItem.length - 2 * EPSILON);
  } else {
    setUserSetTime.reducer(state, firstItem.absoluteStart);
  }
  state.selection = null;
});

export const goRight = createActionWithReducer<EditorState>('editor/goRight', (state) => {
  const items = getItemsAtTime(
    DocumentGenerator.fromParagraphs(state.document.content),
    state.currentTimePlayer
  );

  const secondItem = items[items.length - 1];
  assertSome(secondItem);

  if (items.length == 2 && secondItem.lastInParagraph) {
    setUserSetTime.reducer(state, secondItem.absoluteStart + secondItem.length - 2 * EPSILON);
  } else {
    setUserSetTime.reducer(state, secondItem.absoluteStart + secondItem.length);
  }
  state.selection = null;
});
