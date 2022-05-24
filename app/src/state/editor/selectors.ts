import { EditorState, Selection } from './types';
import {
  Document,
  DocumentItem,
  Paragraph as ParagraphType,
  ParagraphBreakItem,
  ParagraphItem,
  RenderItem,
  TimedDocumentItem,
  TimedItemExtension,
  TimedMacroItem,
  TimedParagraphItem,
  UntimedMacroItem,
  Word,
} from '../../core/document';
import _ from 'lodash';
import { assertSome, assertUnreachable, roughEq } from '../../util';
import { isDraft, original } from 'immer';

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
  const immerAwareFn = (...args: T): R => {
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
  return immerAwareFn;
}

export const memoizedTimedDocumentItems = memoize(
  (content: DocumentItem[]): TimedDocumentItem[] => {
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

export const currentItem = (state: EditorState): TimedDocumentItem | undefined => {
  const timedItems = memoizedTimedDocumentItems(state.document.content);
  return timedItems[currentIndex(state)];
};

export function getIndexAtTime(content: DocumentItem[], time: number): number {
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

function itemLength(item: DocumentItem) {
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

function isParagraphBreakAtStart(content: DocumentItem[]): boolean {
  for (const item of content) {
    if (item.type == 'paragraph_break') {
      return true;
    } else if (isParagraphItem(item)) {
      return false;
    }
  }
  return true;
}

export function selectedItems(state: EditorState): TimedDocumentItem[] {
  return memoizedSelectedItems(state.document.content, state.selection);
}

const memoizedSelectedItems = memoize(
  (content: DocumentItem[], selection: Selection | null): TimedDocumentItem[] => {
    if (!selection) {
      return [];
    } else {
      const selectedItems = memoizedTimedDocumentItems(content).slice(
        selection.startIndex,
        selection.startIndex + selection.length
      );
      if (!isParagraphBreakAtStart(selectedItems)) {
        selectedItems.splice(0, 0, {
          type: 'paragraph_break',
          speaker: getSpeakerAtIndex(content, selection.startIndex),
          absoluteIndex: selectedItems[0].absoluteIndex - 1,
          absoluteStart: selectedItems[0].absoluteStart,
        });
      }
      return selectedItems;
    }
  }
);

export function selectionDocument(state: EditorState): Document {
  const timedDocumentSlice: TimedDocumentItem[] = selectedItems(state);

  const documentSlice = untimeDocumentItems(timedDocumentSlice);
  const neededSources = new Set(documentSlice.map((x) => 'source' in x && x.source));
  const filteredSources = Object.fromEntries(
    Object.entries(state.document.sources).filter(([k, _]) => neededSources.has(k))
  );
  return {
    content: documentSlice,
    sources: filteredSources,
  };
}

function untimeDocumentItems(items: TimedDocumentItem[]): DocumentItem[] {
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

export const memoizedParagraphItems = memoize((content: DocumentItem[]): TimedParagraphItem[] => {
  return filterTimedParagraphItems(memoizedTimedDocumentItems(content));
});

const getRenderType = (type: 'silence' | 'artificial_silence' | 'word'): 'media' | 'silence' => {
  switch (type) {
    case 'word':
    case 'silence':
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

export const memoizedDocumentRenderItems = memoize((content: DocumentItem[]): RenderItem[] => {
  const timedContent = memoizedTimedDocumentItems(content);
  return renderItems(timedContent);
});

export function renderItems(timedContent: TimedDocumentItem[]): RenderItem[] {
  const items = [];
  let current: RenderItem | null = null;
  let current_speaker: string | null = null;
  for (const item of timedContent) {
    if (item.type == 'paragraph_break') {
      current_speaker = item.speaker;
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
        case 'silence':
        case 'word': {
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
        default:
          assertUnreachable(item);
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

export const isParagraphItem = (item: DocumentItem): item is ParagraphItem =>
  ['word', 'silence', 'artificial_silence'].indexOf(item.type) >= 0;

export const isTimedParagraphItem = (item: TimedDocumentItem): item is TimedParagraphItem =>
  ['word', 'silence', 'artificial_silence'].indexOf(item.type) >= 0;

const filterTimedParagraphItems = (content: TimedDocumentItem[]): TimedParagraphItem[] =>
  content.filter(isTimedParagraphItem);

export const memoizedMacroItems = memoize((content: DocumentItem[]): TimedMacroItem[] => {
  const timedContent = memoizedTimedDocumentItems(content);
  for (const item of timedContent) {
    if (item.type == 'paragraph_break') {
      break;
    } else if (isTimedParagraphItem(item)) {
      throw new Error('ParagraphItem encountered before first paragraph break.');
    }
  }
  return timedContent
    .filter(
      (item): item is ParagraphBreakItem & TimedItemExtension => item.type == 'paragraph_break'
    )
    .map((item, idx, arr): TimedMacroItem => {
      switch (item.type) {
        case 'paragraph_break': {
          const start = item.absoluteIndex;
          const end = arr[idx + 1]?.absoluteIndex || timedContent.length;
          const { speaker, absoluteStart, absoluteIndex } = item;
          return {
            type: 'paragraph',
            speaker,
            content: filterTimedParagraphItems(timedContent.slice(start, end)),
            absoluteIndex,
            absoluteStart,
          };
        }
      }
    });
});

export function getSpeakerAtIndex(items: DocumentItem[], index: number): string | null {
  for (let idx = Math.min(index, items.length) - 1; idx >= 0; idx--) {
    const idxItem = items[idx];
    if (idxItem.type == 'paragraph_break') {
      return idxItem.speaker;
    }
  }
  return null;
}

export const currentSpeaker = (state: EditorState): string | null => {
  const curItem = currentItem(state);
  const timedItems = memoizedTimedDocumentItems(state.document.content);
  return getSpeakerAtIndex(timedItems, curItem?.absoluteIndex || 0);
};

export const memoizedSpeakerIndices = memoize((contentMacros: TimedMacroItem[]) => {
  const uniqueSpeakerNames = new Set(
    contentMacros
      .filter(
        (x): x is ParagraphType & TimedItemExtension => x.type == 'paragraph' && x.speaker != null
      )
      .map((p) => p.speaker)
  );
  return Object.fromEntries(Array.from(uniqueSpeakerNames).map((name, i) => [name, i]));
});

export const firstPossibleCursorPosition = (content: DocumentItem[]): number => {
  if (content.length >= 1 && content[0].type == 'paragraph_break') {
    return 1;
  }
  return 0;
};

export function macroItemsToText(
  macroItems: UntimedMacroItem[],
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
            .filter((x): x is Word & TimedDocumentItem => x.type == 'word')
            .map((x) => x.word)
            .join(' ');
          return paragraphText.trim();
        }
      }
    })
    .filter((x) => x !== '')
    .join('\n\n');
}
