import { EditorState, Selection } from './types';
import {
  Document,
  RenderItem,
  TimedItemExtension,
  V3DocumentItem,
  V3TimedDocumentItem,
  V3TimedMacroItem,
  V3TimedParagraphItem,
  V3ParagraphItem,
  V3Paragraph,
  V3TextItem,
  UuidExtension,
  V3UntimedMacroItem,
} from '../../core/document';
import _ from 'lodash';
import { assertSome, assertUnreachable, roughEq } from '../../util';
import { isDraft, original } from 'immer';
import { v4 as uuidv4 } from 'uuid';

function isSame<T extends any[]>(a: T, b: T): boolean {
  if (a.length != b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// Warning: We only care for state changes after they ran through immerjs once.
// Because of this you now have to be careful when using the selectors after modifying the state.
// If your current state is different from the memoized state, but immerjs didn't notice yet,
// you will get the memoized value. See the 'memoize returns old value if called within immerjs'
// test in selectors.spec.ts for an example
export function memoize<T extends any[], R>(fn: (...a: T) => R, size = 4): (...a: T) => R {
  const cache: { key: T; value: R }[] = [];
  return (...args: T): R => {
    const newArgs = args.map((obj) => (isDraft(obj) ? original(obj) : obj)) as T;
    for (const entry of cache) {
      if (isSame(entry.key, newArgs)) {
        return entry.value;
      }
    }
    const newEntry = { key: newArgs, value: fn(...newArgs) };
    cache.splice(0, Math.max(0, cache.length + 1 - size));
    cache.push(newEntry);
    return newEntry.value;
  };
}

export const memoizedTimedDocumentItems = memoize(
  (content: V3DocumentItem[]): V3TimedDocumentItem[] => {
    let absoluteTime = 0;
    return content.map((item, idx) => {
      const timedItem = { ...item, absoluteStart: absoluteTime, absoluteIndex: idx };
      if ('length' in item) {
        absoluteTime += item.length;
      }
      return timedItem;
    });
  }
);

export const currentItem = (state: EditorState): V3TimedDocumentItem | undefined => {
  const timedItems = memoizedTimedDocumentItems(state.document.content);
  return timedItems[currentIndex(state)];
};

export function getIndexAtTime(content: V3DocumentItem[], time: number): number {
  const timedItems = memoizedTimedDocumentItems(content);

  return (
    _.sortedLastIndexBy<{ absoluteStart: number }>(
      timedItems,
      { absoluteStart: time },
      (item) => item.absoluteStart
    ) - 1
  );
}

export const currentIndex = (state: EditorState): number => {
  switch (state.cursor.current) {
    case 'user':
      return state.cursor.userIndex;
    case 'player': {
      const currentTime = currentCursorTime(state);
      return getIndexAtTime(state.document.content, currentTime);
    }
  }
};

export const currentIndexLeft = (state: EditorState): number => {
  const timedItems = memoizedTimedDocumentItems(state.document.content);
  switch (state.cursor.current) {
    case 'user':
      return state.cursor.userIndex - 1;
    case 'player': {
      const idx = currentIndex(state);
      if (timedItems[idx].absoluteStart >= state.cursor.playerTime) {
        return idx - 1;
      }
      return idx;
    }
  }
};

function itemLength(item: V3DocumentItem) {
  if ('length' in item) {
    return item.length;
  }
  return 0;
}
export const currentCursorTime = (state: EditorState): number => {
  switch (state.cursor.current) {
    case 'player':
      return state.cursor.playerTime;
    case 'user': {
      const timedItems = memoizedTimedDocumentItems(state.document.content);
      if (state.cursor.userIndex < timedItems.length) {
        return timedItems[state.cursor.userIndex].absoluteStart;
      } else if (timedItems.length == 0) {
        return 0;
      } else {
        const lastItem = timedItems[timedItems.length - 1];
        return lastItem.absoluteStart + itemLength(lastItem);
      }
    }
  }
};

function isSpeakerChangeAtStart(content: V3DocumentItem[]): boolean {
  if (content.length == 0) {
    return true;
  } else {
    return content[0].type == 'speaker_change';
  }
}

export function selectedItems(state: EditorState): V3TimedDocumentItem[] {
  return memoizedSelectedItems(state.document.content, state.selection);
}

const memoizedSelectedItems = memoize(
  (content: V3DocumentItem[], selection: Selection | null): V3TimedDocumentItem[] => {
    if (!selection) {
      return [];
    } else {
      const selectedItems = memoizedTimedDocumentItems(content).slice(
        selection.startIndex,
        selection.startIndex + selection.length
      );
      if (!isSpeakerChangeAtStart(selectedItems)) {
        selectedItems.splice(0, 0, {
          type: 'speaker_change',
          ...getSpeakerDataAtIndex(content, selection.startIndex),
          absoluteIndex: selectedItems[0].absoluteIndex - 1,
          absoluteStart: selectedItems[0].absoluteStart,
          uuid: uuidv4(),
        });
      }
      return selectedItems;
    }
  }
);

export function selectionDocument(state: EditorState): Document {
  const timedDocumentSlice: V3TimedDocumentItem[] = selectedItems(state);

  const documentSlice = untimeDocumentItems(timedDocumentSlice);
  const neededSources = new Set(documentSlice.map((x) => 'source' in x && x.source));
  const filteredSources = Object.fromEntries(
    Object.entries(state.document.sources).filter(([k, _]) => neededSources.has(k))
  );
  return {
    content: documentSlice,
    sources: filteredSources,
    metadata: state.document.metadata,
  };
}

function untimeDocumentItems(items: V3TimedDocumentItem[]): V3DocumentItem[] {
  return items.map((item) => {
    const { absoluteStart: _aS, absoluteIndex: _aI, ...untimedIcon } = item;
    return untimedIcon;
  });
}

export function selectionSpansMultipleParagraphs(state: EditorState): boolean {
  const selection = state.selection;
  assertSome(selection);

  const selectedItems = memoizedTimedDocumentItems(state.document.content).slice(
    selection.startIndex,
    selection.startIndex + selection.length
  );
  return selectedItems.filter((x) => x.type == 'paragraph_break').length > 0;
}

export const memoizedParagraphItems = memoize(
  (content: V3DocumentItem[]): V3TimedParagraphItem[] => {
    return filterTimedParagraphItems(memoizedTimedDocumentItems(content));
  }
);

const getRenderType = (type: 'non_text' | 'artificial_silence' | 'text'): 'media' | 'silence' => {
  switch (type) {
    case 'text':
    case 'non_text':
      return 'media';
    case 'artificial_silence':
      return 'silence';
  }
};

const isSameSource = (
  item1: { type: string; source?: string },
  item2: { type: string; source?: string }
): boolean => {
  return item1.source === item2.source;
};

function isSubsequentSourceSegment(
  current: { type: string; sourceStart?: number; length: number },
  item: { type: string; sourceStart?: number }
): boolean {
  if (current.sourceStart == undefined || item.sourceStart == undefined) {
    // This means that both current and item are artificial silences
    return current.sourceStart == undefined && item.sourceStart == undefined;
  } else {
    return roughEq(current.sourceStart + current.length, item.sourceStart);
  }
}

export const memoizedDocumentRenderItems = memoize((content: V3DocumentItem[]): RenderItem[] => {
  const timedContent = memoizedTimedDocumentItems(content);
  return renderItems(timedContent);
});

export function renderItems(timedContent: V3TimedDocumentItem[]): RenderItem[] {
  const items = [];
  let current: RenderItem | null = null;
  let current_speaker: string | null = null;
  for (const item of timedContent) {
    if (item.type == 'speaker_change') {
      current_speaker = item.speaker;
    } else if (item.type == 'paragraph_break') {
      // we don't core about para break
    } else if (
      !current ||
      getRenderType(item.type) != current.type ||
      !isSubsequentSourceSegment(current, item) ||
      !isSameSource(current, item) ||
      ('speaker' in current && current_speaker != current.speaker)
    ) {
      if (current) {
        items.push(current);
      }
      current = null;
      switch (item.type) {
        case 'non_text':
        case 'text': {
          const { absoluteStart, length, sourceStart, source } = item;
          if (current_speaker === null) {
            throw new Error('Current speaker is null. Who is the speaker?');
          }
          current = {
            type: 'media',
            absoluteStart,
            length,
            sourceStart,
            source,
            speaker: current_speaker,
          };
          break;
        }
        case 'artificial_silence': {
          const { absoluteStart, length } = item;
          current = {
            type: 'silence',
            absoluteStart,
            length,
          };
          break;
        }
        default: {
          assertUnreachable(item);
        }
      }
    } else {
      current.length = item.absoluteStart - current.absoluteStart + item.length;
    }
  }
  if (current) {
    items.push(current);
  }
  return items;
}

export const isParagraphItem = (item: V3DocumentItem): item is V3ParagraphItem =>
  ['text', 'non_text', 'artificial_silence'].indexOf(item.type) >= 0;

export const isTimedParagraphItem = (item: V3TimedDocumentItem): item is V3TimedParagraphItem =>
  ['text', 'non_text', 'artificial_silence'].indexOf(item.type) >= 0;

const filterTimedParagraphItems = (content: V3TimedDocumentItem[]): V3TimedParagraphItem[] =>
  content.filter(isTimedParagraphItem);

export const memoizedMacroItems = memoize((content: V3DocumentItem[]): V3TimedMacroItem[] => {
  const timedContent = memoizedTimedDocumentItems(content);
  for (const item of timedContent) {
    if (item.type == 'speaker_change') {
      break;
    } else if (isTimedParagraphItem(item)) {
      throw new Error('ParagraphItem encountered before first speaker change.');
    }
  }
  const macros = [];
  let cur_macro: V3TimedMacroItem = {
    type: 'paragraph',
    speaker: '',
    content: [],
    language: null,
    absoluteIndex: 0,
    absoluteStart: 0,
  };
  for (const item of timedContent) {
    if (item.type == 'paragraph_break') {
      macros.push(cur_macro);
      cur_macro = {
        type: 'paragraph',
        speaker: cur_macro.speaker,
        content: [],
        language: cur_macro.language,
        absoluteIndex: item.absoluteIndex,
        absoluteStart: item.absoluteStart,
      };
    } else if (item.type == 'speaker_change') {
      cur_macro.speaker = item.speaker;
      cur_macro.language = item.language;
    } else if (isParagraphItem(item)) {
      cur_macro.content.push(item);
    }
  }
  return macros;
  // return timedContent
  //   .filter(
  //     (item): item is V3ParagraphBreakItem & TimedItemExtension => item.type == 'paragraph_break'
  //   )
  //   .map((item, idx, arr): V3TimedMacroItem => {
  //     switch (item.type) {
  //       case 'paragraph_break': {
  //         const start = item.absoluteIndex;
  //         const end = arr[idx + 1]?.absoluteIndex || timedContent.length;
  //         const { speaker, absoluteStart, absoluteIndex } = item;
  //         return {
  //           type: 'paragraph',
  //           speaker,
  //           content: filterTimedParagraphItems(timedContent.slice(start, end)),
  //           absoluteIndex,
  //           absoluteStart,
  //         };
  //       }
  //     }
  //   });
});

export function getSpeakerDataAtIndex(
  items: V3DocumentItem[],
  index: number
): { speaker: string; language: string | null } {
  for (let idx = Math.min(index, items.length) - 1; idx >= 0; idx--) {
    const idxItem = items[idx];
    if (idxItem.type == 'speaker_change') {
      return { speaker: idxItem.speaker, language: idxItem.language };
    }
  }
  return { speaker: '', language: null };
}

export const currentSpeaker = (state: EditorState): string => {
  const curItem = currentItem(state);
  const timedItems = memoizedTimedDocumentItems(state.document.content);
  return getSpeakerDataAtIndex(timedItems, curItem?.absoluteIndex || 0).speaker;
};

export const memoizedSpeakerIndices = memoize((contentMacros: V3TimedMacroItem[]) => {
  const uniqueSpeakerNames = new Set(
    contentMacros
      .filter(
        (x): x is V3Paragraph & TimedItemExtension => x.type == 'paragraph' && x.speaker != ''
      )
      .map((p) => p.speaker)
  );
  return Object.fromEntries(Array.from(uniqueSpeakerNames).map((name, i) => [name, i]));
});

export const firstPossibleCursorPosition = (content: V3DocumentItem[]): number => {
  if (content.length >= 1 && content[0].type == 'speaker_change') {
    return 1;
  }
  return 0;
};

export function macroItemsToText(
  macroItems: V3UntimedMacroItem[],
  displaySpeakerNames: boolean
): string {
  return macroItems
    .map((paragraph) => {
      switch (paragraph.type) {
        case 'paragraph': {
          let paragraphText = '';
          if (displaySpeakerNames) {
            paragraphText += `${paragraph.speaker}:\n`;
          }
          paragraphText += paragraph.content
            .filter((x): x is V3TextItem & UuidExtension & TimedItemExtension => x.type == 'text')
            .map((x) => x.text)
            .join(' ');
          return paragraphText.trim();
        }
      }
    })
    .filter((x) => x !== '')
    .join('\n\n');
}
