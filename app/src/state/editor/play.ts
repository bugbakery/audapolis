import { assertSome, EPSILON } from '../../util';
import { createActionWithReducer } from '../util';
import { EditorState } from './types';
import { currentItem, firstPossibleCursorPosition } from './selectors';

export const setPlayerTime = createActionWithReducer<EditorState, number>(
  'editor/setTimePlayer',
  (state, newTime) => {
    state.cursor.current = 'player';
    state.cursor.playerTime = newTime;
  }
);

export const setUserIndex = createActionWithReducer<EditorState, number>(
  'editor/setUserIndex',
  (state, newIndex) => {
    state.cursor.current = 'user';
    if (newIndex < 0) {
      newIndex = 0;
    }
    if (newIndex > state.document.content.length - 1) {
      newIndex = state.document.content.length - 1;
    }
    state.cursor.userIndex = newIndex;
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
  if (state.cursor.current == 'user') {
    const newPosition = Math.max(
      state.cursor.userIndex - 1,
      firstPossibleCursorPosition(state.document.content)
    );
    setUserIndex.reducer(state, newPosition);
  } else {
    const item = currentItem(state);
    assertSome(item);
    if (state.cursor.playerTime > item.absoluteStart + EPSILON) {
      setUserIndex.reducer(state, item.absoluteIndex);
    } else {
      setUserIndex.reducer(state, item.absoluteIndex - 1);
    }
  }

  state.selection = null;
});

export const goRight = createActionWithReducer<EditorState>('editor/goRight', (state) => {
  if (state.cursor.current == 'user') {
    setUserIndex.reducer(state, state.cursor.userIndex + 1);
  } else {
    const item = currentItem(state);
    assertSome(item);
    const itemLength = 'length' in item ? item.length : 0;
    if (state.cursor.playerTime + EPSILON < item.absoluteStart + itemLength) {
      setUserIndex.reducer(state, item.absoluteIndex + 1);
    } else {
      setUserIndex.reducer(state, item.absoluteIndex + 2);
    }
  }

  state.selection = null;
});
