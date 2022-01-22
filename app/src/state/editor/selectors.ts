// - currentItem
// - document as render items
// - playback relevant items (media, transition)
// - as paragraphs
// - items in selection
// - [x] document with timed items
// - [x] current cursor time

import { EditorState } from './types';
import { DocumentItem } from '../../core/document';
import _ from 'lodash';
import memoize from 'proxy-memoize';

export type TimedDocumentItem = DocumentItem & { absoluteStart: number; absoluteIndex: number };
export const timedDocumentItems = memoize((state: EditorState): TimedDocumentItem[] => {
  let absoluteTime = 0;
  return state.document.content.map((item, idx) => {
    const timedItem = { ...item, absoluteStart: absoluteTime, absoluteIndex: idx };
    if ('length' in item) {
      absoluteTime += item.length;
    }
    return timedItem;
  });
});

export const currentItem = memoize((state: EditorState): TimedDocumentItem => {
  const timedItems = timedDocumentItems(state);
  switch (state.cursor.current) {
    case 'user':
      return timedItems[state.cursor.userIndex];
    case 'player': {
      const currentTime = currentCursorTime(state);
      const currentIndex = _.sortedIndexBy<{ absoluteStart: number }>(
        timedItems,
        { absoluteStart: currentTime },
        (item) => item.absoluteStart
      );
      return timedItems[currentIndex];
    }
  }
});

export const currentCursorTime = memoize((state: EditorState): number => {
  switch (state.cursor.current) {
    case 'player':
      return state.cursor.playerTime;
    case 'user':
      return currentItem(state).absoluteStart;
  }
});
