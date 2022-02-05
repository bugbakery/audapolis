/***
 * This file contains code for managing the selection. If you know what you are doing and just want
 * to modify the selection, `setSelection` might be the way to go.
 *
 * If your code is in some way user facing, the other functions might just be right for you. They
 * perform certain actions on the selection (e.g. growing/shrinking it) while taking care to make
 * the experience as intuitive as possible.
 */

import { assertSome, EPSILON } from '../../util';
import { createActionWithReducer } from '../util';
import { EditorState, Selection } from './types';
import { currentCursorTime, isParagraphItem, timedDocumentItems } from './selectors';
import _ from 'lodash';

export const setSelection = createActionWithReducer<EditorState, Selection | null>(
  'editor/setSelection',
  (state, payload) => {
    state.selection = payload;
  }
);

function changeSelectionLeft(state: EditorState) {
  assertSome(state.selection);
  const timedItems = timedDocumentItems(state.document.content);
  if (state.selection.headPosition == 'left') {
    state.selection.startIndex -= 1;
    state.selection.length += 1;
    if (
      state.selection.startIndex > 0 &&
      isParagraphItem(timedItems[state.selection.startIndex]) &&
      timedItems[state.selection.startIndex - 1].type == 'paragraph_break'
    ) {
      state.selection.startIndex -= 1;
      state.selection.length += 1;
    }
    state.cursor.current = 'user';
    state.cursor.userIndex = state.selection.startIndex;
  } else {
    state.selection.length -= 1;
    state.cursor.current = 'user';
    state.cursor.userIndex = state.selection.startIndex + state.selection.length;
    if (state.selection.length == 0) {
      state.selection = null;
    }
  }
}

function leftIndex(state: EditorState): number {
  const timedItems = timedDocumentItems(state.document.content);
  switch (state.cursor.current) {
    case 'user':
      return state.cursor.userIndex - 1;
    case 'player': {
      const currentTime = currentCursorTime(state);
      const currentIdx =
        _.sortedLastIndexBy<{ absoluteStart: number }>(
          timedItems,
          { absoluteStart: currentTime },
          (item) => item.absoluteStart
        ) - 1;
      const previousIdx =
        _.sortedLastIndexBy<{ absoluteStart: number }>(
          timedItems,
          { absoluteStart: currentTime - EPSILON },
          (item) => item.absoluteStart
        ) - 1;
      const previousItem = timedItems[previousIdx];
      if (
        isParagraphItem(previousItem) &&
        previousItem.absoluteStart + previousItem.length >= state.cursor.playerTime
      ) {
        return previousIdx;
      } else {
        return currentIdx;
      }
    }
  }
}
function createSelectionLeft(state: EditorState) {
  const curIdx = leftIndex(state);
  const timedContent = timedDocumentItems(state.document.content);
  const curItem = timedContent[curIdx];
  state.selection = { headPosition: 'left', length: 1, startIndex: curItem.absoluteIndex };
  if (
    state.selection.startIndex > 0 &&
    isParagraphItem(timedContent[state.selection.startIndex]) &&
    timedContent[state.selection.startIndex - 1].type == 'paragraph_break'
  ) {
    state.selection.startIndex -= 1;
    state.selection.length += 1;
  }
  state.cursor.current = 'user';
  state.cursor.userIndex = state.selection.startIndex;
}

export const moveHeadLeft = createActionWithReducer<EditorState>('editor/moveHeadLeft', (state) => {
  if (state.selection) {
    changeSelectionLeft(state);
  } else {
    createSelectionLeft(state);
  }
});

function changeSelectionRight(state: EditorState) {
  assertSome(state.selection);
  const timedItems = timedDocumentItems(state.document.content);
  if (state.selection.headPosition == 'left') {
    state.selection.startIndex += 1;
    state.selection.length -= 1;
    state.cursor.current = 'user';
    state.cursor.userIndex = state.selection.startIndex;
    if (state.selection.length == 0) {
      state.selection = null;
    }
  } else {
    state.selection.length += 1;
    const curItem = timedItems[state.selection.startIndex + state.selection.length - 1];
    const nextItem = timedItems[state.selection.startIndex + state.selection.length];
    if (curItem && curItem.type == 'paragraph_break' && nextItem && isParagraphItem(nextItem)) {
      state.selection.length += 1;
    }
    state.cursor.current = 'user';
    state.cursor.userIndex = state.selection.startIndex + state.selection.length;
  }
}

function rightIndex(state: EditorState): number {
  const timedItems = timedDocumentItems(state.document.content);
  switch (state.cursor.current) {
    case 'user':
      return state.cursor.userIndex;
    case 'player': {
      const currentTime = currentCursorTime(state);
      const currentIdx =
        _.sortedLastIndexBy<{ absoluteStart: number }>(
          timedItems,
          { absoluteStart: currentTime },
          (item) => item.absoluteStart
        ) - 1;
      const previousItem = timedItems[currentIdx - 1];
      if (previousItem?.type == 'paragraph_break') {
        return currentIdx - 1;
      } else {
        return currentIdx;
      }
    }
  }
}

function createSelectionRight(state: EditorState) {
  const curIdx = rightIndex(state);
  const timedContent = timedDocumentItems(state.document.content);
  const curItem = timedContent[curIdx];
  const nextItem = timedContent[curIdx + 1];
  state.selection = { headPosition: 'right', length: 1, startIndex: curItem.absoluteIndex };
  if (curItem.type == 'paragraph_break' && isParagraphItem(nextItem)) {
    state.selection.length += 1;
  }
  state.cursor.current = 'user';
  state.cursor.userIndex = state.selection.startIndex + state.selection.length;
}

export const moveHeadRight = createActionWithReducer<EditorState>(
  'editor/moveHeadRight',
  (state) => {
    if (state.selection) {
      changeSelectionRight(state);
    } else {
      createSelectionRight(state);
    }
  }
);

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

export const selectionIncludeFully = createActionWithReducer<EditorState, number>(
  'editor/selectionIncludeFully',
  (state, absoluteIndex) => {
    if (state.selection == null) {
      state.selection = { headPosition: 'right', startIndex: absoluteIndex, length: 1 };
    } else if (absoluteIndex < state.selection.startIndex) {
      state.selection.length += state.selection.startIndex - absoluteIndex;
      state.selection.startIndex = absoluteIndex;
      state.selection.headPosition = 'left';
    } else if (absoluteIndex > state.selection.startIndex + state.selection.length - 1) {
      state.selection.length = absoluteIndex - state.selection.startIndex + 1;
      state.selection.headPosition = 'right';
    }
  }
);
