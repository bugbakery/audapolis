/***
 * This file contains code for managing the selection. If you know what you are doing and just want
 * to modify the selection, `setSelection` might be the way to go.
 *
 * If your code is in some way user facing, the other functions might just be right for you. They
 * perform certain actions on the selection (e.g. growing/shrinking it) while taking care to make
 * the experience as intuitive as possible.
 */

import { assertSome } from '../../util';
import { createActionWithReducer } from '../util';
import { EditorState, Selection } from './types';
import { currentIndex, currentIndexLeft, timedDocumentItems } from './selectors';

export const setSelection = createActionWithReducer<EditorState, Selection | null>(
  'editor/setSelection',
  (state, payload) => {
    state.selection = payload;
    setCursorToSelectionHead(state);
  }
);

function setCursorToSelectionHead(state: EditorState) {
  if (state.selection == null) {
    return;
  }
  state.cursor.current = 'user';
  if (state.selection.headPosition == 'left') {
    state.cursor.userIndex = state.selection.startIndex;
  } else {
    state.cursor.userIndex = state.selection.startIndex + state.selection.length;
  }
}

export const moveSelectionHeadLeft = createActionWithReducer<EditorState>(
  'editor/moveSelectionHeadLeft',
  (state) => {
    if (state.selection !== null) {
      changeSelectionHeadLeft(state);
    } else {
      createSelectionLeft(state);
    }
  }
);

function changeSelectionHeadLeft(state: EditorState) {
  assertSome(state.selection);
  if (state.selection.headPosition == 'left') {
    state.selection.startIndex -= 1;
    state.selection.length += 1;
    setCursorToSelectionHead(state);
  } else {
    state.selection.length -= 1;
    setCursorToSelectionHead(state); // we have to do this **before** checking if we need to collapse the selection in the following if
    if (state.selection.length == 0) {
      state.selection = null;
    }
  }
}

function createSelectionLeft(state: EditorState) {
  const curIdx = currentIndexLeft(state);
  const timedContent = timedDocumentItems(state.document.content);
  const curItem = timedContent[curIdx];
  if (curItem == undefined) {
    return;
  }
  state.selection = { headPosition: 'left', length: 1, startIndex: curItem.absoluteIndex };
  setCursorToSelectionHead(state);
}

export const moveSelectionHeadRight = createActionWithReducer<EditorState>(
  'editor/moveSelectionHeadRight',
  (state) => {
    if (state.selection) {
      changeSelectionHeadRight(state);
    } else {
      createSelectionRight(state);
    }
  }
);

function changeSelectionHeadRight(state: EditorState) {
  assertSome(state.selection);
  if (state.selection.headPosition == 'left') {
    state.selection.startIndex += 1;
    state.selection.length -= 1;
    setCursorToSelectionHead(state);
    if (state.selection.length == 0) {
      state.selection = null;
    }
  } else {
    state.selection.length += 1;
    setCursorToSelectionHead(state);
  }
}

function createSelectionRight(state: EditorState) {
  const curIdx = currentIndex(state);
  const timedContent = timedDocumentItems(state.document.content);
  const curItem = timedContent[curIdx];
  state.selection = { headPosition: 'right', length: 1, startIndex: curItem.absoluteIndex };
  setCursorToSelectionHead(state);
}

export const selectAll = createActionWithReducer<EditorState>('editor/selectAll', (state) => {
  if (state.document.content.length > 0) {
    state.selection = {
      headPosition: 'left',
      startIndex: 0,
      length: state.document.content.length,
    };
  } else {
    state.selection = null;
  }
});

export const moveSelectionHeadTo = createActionWithReducer<EditorState, number>(
  'editor/moveSelectionHeadTo',
  (state, absoluteIndex) => {
    const anchor = state.selection !== null ? getAnchor(state.selection) : currentIndex(state);
    state.selection = setSelectionFromAnchorAndFocus(anchor, absoluteIndex);
    state.cursor.current = 'user';
    state.cursor.userIndex = absoluteIndex;
  }
);

function getAnchor(selection: Selection): number {
  switch (selection.headPosition) {
    case 'left':
      return selection.startIndex + selection.length;
    case 'right':
      return selection.startIndex;
  }
}

function setSelectionFromAnchorAndFocus(anchor: number, focus: number): Selection | null {
  if (anchor == focus) {
    return null;
  }
  return {
    startIndex: Math.min(anchor, focus),
    length: Math.abs(anchor - focus),
    headPosition: anchor < focus ? 'right' : 'left',
  };
}
