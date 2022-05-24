import { assertSome } from '../../util';
import {
  deserializeDocument,
  Document,
  DocumentItem,
  serializeDocument,
  Source,
  TimedDocumentItem,
} from '../../core/document';
import { clipboard } from 'electron';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { EditorState } from './types';
import {
  currentCursorTime,
  currentIndex,
  currentItem,
  currentSpeaker,
  getSpeakerAtIndex,
  isParagraphItem,
  macroItemsToText,
  memoizedMacroItems,
  selectedItems,
  selectionDocument,
} from './selectors';

function getInsertPos(state: EditorState): number {
  switch (state.cursor.current) {
    case 'user':
      return state.cursor.userIndex;
    case 'player': {
      const item = currentItem(state);
      if (!item) {
        throw new Error('no current item');
      }
      const curPos = currentCursorTime(state);
      const itemLength = 'length' in item ? item.length : 0;
      const itemMiddle = item.absoluteStart + itemLength / 2;
      return curPos <= itemMiddle ? item.absoluteIndex : item.absoluteIndex + 1;
    }
  }
}
export const insertParagraphBreak = createActionWithReducer<EditorState>(
  'editor/insertParagraphBreak',
  (state) => {
    const insertPos = getInsertPos(state);
    const speaker = currentSpeaker(state);
    state.document.content.splice(insertPos, 0, {
      type: 'paragraph_break',
      speaker: speaker,
    });
    state.cursor.current = 'user';
    state.cursor.userIndex = insertPos + 1;
  }
);

export const deleteSelection = createActionWithReducer<EditorState>(
  'editor/deleteSelection',
  (state) => {
    const selection = state.selection;
    if (selection) {
      state.document.content.splice(selection.startIndex, selection.length);
      state.cursor.current = 'user';
      state.cursor.userIndex = selection.startIndex;
    }
    state.selection = null;
  }
);

export const setWord = createActionWithReducer<
  EditorState,
  { absoluteIndex: number; text: string }
>('editor/setWord', (state, payload) => {
  const item = state.document.content[payload.absoluteIndex];
  if (item.type !== 'word') {
    throw new Error('setWord called on item that is not a word');
  }
  item.word = payload.text;
});

export const reassignParagraph = createActionWithReducer<
  EditorState,
  { absoluteIndex: number; newSpeaker: string | null }
>('editor/reassignParagraph', (state, payload) => {
  const { absoluteIndex, newSpeaker } = payload;
  const item = state.document.content[absoluteIndex];
  if (item.type !== 'paragraph_break') {
    throw new Error('reassignParagraph called on item that is not a paragraph_break');
  }
  item.speaker = newSpeaker;
});

export const renameSpeaker = createActionWithReducer<
  EditorState,
  { oldName: string | null; newName: string }
>('editor/renameSpeaker', (state, payload) => {
  const { oldName, newName } = payload;

  state.document.content = state.document.content.map((item) => {
    if (item.type == 'paragraph_break' && item.speaker === oldName) {
      return { ...item, speaker: newName };
    } else {
      return item;
    }
  });
});

function deleteParagraphBreak(state: EditorState, currentIndex: number) {
  const item = state.document.content[currentIndex];
  if (item.type !== 'paragraph_break') {
    throw new Error('deleteParagraphBreak needs to be called on a paragraph_break');
  }
  if (currentIndex == firstParagraphBreakIndex(state.document.content)) {
    return;
  }
  state.document.content.splice(currentIndex, 1);
  state.cursor.current = 'user';
  state.cursor.userIndex = currentIndex;
}
function shouldLookLeft(state: EditorState, direction: string): boolean {
  if (direction == 'left' && state.cursor.current == 'user') {
    return true;
  }
  return (
    state.cursor.current == 'player' &&
    state.cursor.playerTime == currentItem(state)?.absoluteStart &&
    direction == 'left'
  );
}
function deleteNonSelection(state: EditorState, direction: 'left' | 'right') {
  const directionOffset = shouldLookLeft(state, direction) ? 1 : 0;
  const curIdx = currentIndex(state) - directionOffset;
  if (curIdx < 0) {
    return;
  }
  const item = state.document.content[curIdx];
  switch (item.type) {
    case 'paragraph_break': {
      deleteParagraphBreak(state, curIdx);
      break;
    }
    case 'silence':
    case 'artificial_silence':
    case 'word': {
      state.selection = { headPosition: direction, startIndex: curIdx, length: 1 };
    }
  }
}
export const deleteSomething = createActionWithReducer<EditorState, 'left' | 'right'>(
  'editor/deleteSomething',
  (state, direction) => {
    if (state.selection !== null) {
      deleteSelection.reducer(state);
    } else {
      deleteNonSelection(state, direction);
    }
  }
);

export const copy = createAsyncActionWithReducer<EditorState>(
  'editor/copy',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    const selection = state.selection;
    if (!selection) {
      return;
    }

    const serializedSlice = await serializeDocument(selectionDocument(state)).generateAsync({
      type: 'nodebuffer',
      streamFiles: true,
    });
    clipboard.writeBuffer('x-audapolis/document-zip', serializedSlice);
  }
);

export const cut = createAsyncActionWithReducer<EditorState>(
  'editor/cut',
  async (arg, { dispatch }) => {
    await dispatch(copy());
    dispatch(deleteSelection());
  }
);

export const paste = createAsyncActionWithReducer<EditorState, void, Document>(
  'editor/paste',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (!clipboard.has('x-audapolis/document-zip')) {
      throw new Error('Clipboard does not contain an audapolis document');
    }
    const buffer = clipboard.readBuffer('x-audapolis/document-zip');
    // TODO: Don't extract sources from zip we already have in our file
    const deserialized = await deserializeDocument(buffer);
    console.log('deserialized document from clipboard: ', deserialized);
    return deserialized;
  },
  {
    fulfilled: (state, payload) => {
      if (payload.content.length == 0) {
        return;
      }
      const mergedSources = { ...state.document.sources, ...payload.sources };
      checkPastedContent(payload, mergedSources);
      deleteSelection.reducer(state);

      const insertPos = getInsertPos(state);

      if (atEmptyUnnamedParagraph(state, insertPos)) {
        state.document.content.splice(insertPos - 1, 1);
      }

      if (pastedEndsWithDifferentSpeakerThanNextItem(state, payload, insertPos)) {
        payload.content.push({
          type: 'paragraph_break',
          speaker: getSpeakerAtIndex(state.document.content, insertPos),
        });
      }

      if (pastedSpeakerMatchesSpeakerAtInsertPos(state, payload, insertPos)) {
        payload.content.splice(0, 1);
      }

      state.document.content.splice(insertPos, 0, ...payload.content);
      state.document.sources = mergedSources;
    },
    rejected: (state, payload) => {
      console.error('paste rejected:', payload);
    },
  }
);

function getLastSpeaker(content: DocumentItem[]): string | null {
  for (const item of content.slice().reverse()) {
    if (item.type == 'paragraph_break') {
      return item.speaker;
    }
  }
  return null;
}

function checkPastedContent(pasted: Document, mergedSources: Record<string, Source>) {
  let paraSeen = false;
  for (const item of pasted.content) {
    if ('source' in item && !(item.source in mergedSources)) {
      throw new Error(`Paste failed, missing source: ${item.source}`);
    }
    if (isParagraphItem(item) && !paraSeen) {
      throw new Error(
        'Parse failed, missing paragraph break. paragraph items without prior paragraph_break'
      );
    }
    if (item.type == 'paragraph_break') {
      paraSeen = true;
    }
  }
}

function atEmptyUnnamedParagraph(state: EditorState, insertPos: number) {
  const previousIdx = Math.max(insertPos - 1, 0);
  const previousItem = state.document.content[previousIdx];
  const nextItem = state.document.content[insertPos];

  return (
    previousItem.type == 'paragraph_break' &&
    previousItem.speaker == null &&
    (!nextItem || !isParagraphItem(nextItem))
  );
}

function pastedSpeakerMatchesSpeakerAtInsertPos(
  state: EditorState,
  payload: Document,
  insertPos: number
): boolean {
  return (
    payload.content.length > 0 &&
    payload.content[0].type == 'paragraph_break' &&
    payload.content[0].speaker == getSpeakerAtIndex(state.document.content, insertPos)
  );
}

function pastedEndsWithDifferentSpeakerThanNextItem(
  state: EditorState,
  payload: Document,
  insertPos: number
): boolean {
  const nextItem = state.document.content[insertPos];
  return (
    nextItem &&
    nextItem.type != 'paragraph_break' &&
    getSpeakerAtIndex(state.document.content, insertPos + 1) != getLastSpeaker(payload.content) &&
    insertPos >= firstParagraphBreakIndex(state.document.content) // if we paste before the first para break, there is no speaker
  );
}

function firstParagraphBreakIndex(content: DocumentItem[]): number {
  const firstIndex = content.findIndex((x) => x.type == 'paragraph_break');
  return firstIndex != -1 ? firstIndex : content.length;
}

export const copySelectionText = createAsyncActionWithReducer<EditorState>(
  'editor/copySelectionText',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (!state.selection) {
      return;
    }

    const timedDocumentSlice: TimedDocumentItem[] = selectedItems(state);

    clipboard.writeText(
      macroItemsToText(memoizedMacroItems(timedDocumentSlice), state.displaySpeakerNames)
    );
  }
);
