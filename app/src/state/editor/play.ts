import { createActionWithReducer } from '../util';
import { EditorState } from './types';
import { currentIndex, firstPossibleCursorPosition } from './selectors';
import { V3DocumentItem } from '../../core/document';

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
    newIndex = Math.max(newIndex, firstPossibleCursorPosition(state.document.content));
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
  moveCursor(state, -1);
});

export const goRight = createActionWithReducer<EditorState>('editor/goRight', (state) => {
  moveCursor(state, 1);
});

function moveCursor(state: EditorState, offset: number) {
  const curPosition = currentIndex(state);
  let newPosition = curPosition + offset;
  if (isBetweenParagraphs(state.document.content, newPosition)) {
    newPosition += offset;
  }
  setUserIndex.reducer(state, newPosition);

  state.selection = null;
}

function isBetweenParagraphs(content: V3DocumentItem[], index: number): boolean {
  const prevItem = content[index - 1];
  const curItem = content[index];
  return (
    prevItem && curItem && prevItem.type == 'paragraph_break' && curItem.type == 'paragraph_start'
  );
}
