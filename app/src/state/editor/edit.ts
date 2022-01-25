import { assertSome, EPSILON } from '../../util';
import { v4 as uuidv4 } from 'uuid';
import {
  deserializeDocument,
  Document,
  DocumentGenerator,
  DocumentGeneratorItem,
  getItemsAtTime,
  serializeDocument,
  TimedV1ParagraphItem,
  Word,
} from '../../core/document';
import { clipboard } from 'electron';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { EditorState } from './types';
import { selectLeft } from './selection';
import { setUserSetTime } from './play';
import { GeneratorBox } from '../../util/itertools';
import { currentCursorTime, currentItem, currentSpeaker } from './selectors';
import _ from 'lodash';
import { dispatch } from 'react-hot-toast/dist/core/store';

export const insertParagraphBreak = createActionWithReducer<EditorState>(
  'editor/insertParagraphBreak',
  (state) => {
    const item = currentItem(state);
    const curPos = currentCursorTime(state);
    const itemLength = 'length' in item ? item.length : 0;
    const itemMiddle = item.absoluteStart + itemLength / 2;
    const insertPos = curPos <= itemMiddle ? item.absoluteIndex : item.absoluteIndex + 1;
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
  { absoluteIndex: number; newSpeaker: string }
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
  { oldName: string; newName: string }
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
  if (currentIndex == 0) {
    item.speaker = null;
  } else {
    state.document.content.splice(currentIndex, 1);
  }
  state.cursor.current = 'user';
  state.cursor.userIndex = currentIndex;
}
function shouldLookLeft(state: EditorState, direction: string): boolean {
  if (direction == 'left' && state.cursor.current == 'user') {
    return true;
  }
  if (
    state.cursor.current == 'player' &&
    state.cursor.playerTime == currentItem(state).absoluteStart &&
    direction == 'left'
  ) {
    return true;
  }
  return false;
}
function deleteNonSelection(state: EditorState, direction: 'left' | 'right') {
  const directionOffset = shouldLookLeft(state, direction) ? 1 : 0;
  const currentIndex = currentItem(state).absoluteIndex - directionOffset;
  if (currentIndex < 0) {
    return;
  }
  const item = state.document.content[currentIndex];
  switch (item.type) {
    case 'paragraph_break': {
      deleteParagraphBreak(state, currentIndex);
      break;
    }
    case 'silence':
    case 'artificial_silence':
    case 'heading':
    case 'word': {
      state.selection = { headPosition: direction, startIndex: currentIndex, length: 1 };
    }
  }
}
export const deleteSomething = createActionWithReducer<EditorState, 'left' | 'right'>(
  'editor/deleteSomething',
  async (state, direction) => {
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

    const documentSlice = DocumentGenerator.fromParagraphs(state.document.content)
      .exactFrom(selection.range.start)
      .exactUntil(selection.range.start + selection.range.length)
      .toParagraphs();

    const serializedSlice = await serializeDocument({
      content: documentSlice,
      sources: state.document.sources,
    }).generateAsync({
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
      throw new Error('cannot paste clipboard contents');
    }
    const buffer = clipboard.readBuffer('x-audapolis/document-zip');
    // TODO: Don't extract sources from zip we already have in our file
    const deserialized = await deserializeDocument(buffer);
    console.log('deserialized document from clipboard: ', deserialized);
    return deserialized;
  },
  {
    fulfilled: (state, payload) => {
      state.selection = null;
      state.document.sources = { ...state.document.sources, ...payload.sources };

      let time = state.currentTimePlayer;
      let items = getItemsAtTime(DocumentGenerator.fromParagraphs(state.document.content), time);
      let endOfParagraph = false;

      // if we are at the end of a paragraph
      const firstItemEnd = items[0].absoluteStart + items[0].length;
      if (firstItemEnd - 2 * EPSILON <= time && firstItemEnd > time) {
        time = items[0].absoluteStart + items[0].length;
        items = getItemsAtTime(DocumentGenerator.fromParagraphs(state.document.content), time);
        endOfParagraph = true;
      }

      const documentGenerator = DocumentGenerator.fromParagraphs(state.document.content).collect();
      const beforeSlice = new GeneratorBox(documentGenerator).takewhile(
        (item) => item.absoluteStart + item.length <= time
      );
      const afterSlice = new GeneratorBox(documentGenerator).dropwhile(
        (item) => item.absoluteStart + item.length <= time
      );
      const pastedSlice = DocumentGenerator.fromParagraphs(payload.content);

      if (!endOfParagraph && items[items.length - 1].firstInParagraph) {
        // we paste to the beginning of a paragrpaph
        let renameDict = { [items[0].speaker]: null as null | string };
        const chained = beforeSlice.chain(
          pastedSlice
            .map((x) => {
              if (x.speaker in renameDict) {
                renameDict[x.speaker] = x.paragraphUuid;
              }
              return x;
            })
            .chain(
              afterSlice.map((x) => {
                if (x.speaker in renameDict) {
                  return { ...x, paragraphUuid: renameDict[x.speaker] || x.paragraphUuid };
                } else {
                  renameDict = {};
                  return x;
                }
              })
            )
        );
        state.document.content = new DocumentGenerator(chained).toParagraphs();
      } else {
        let renameDict = { [items[0].speaker]: null as null | string };
        const chained = beforeSlice
          .map((x) => {
            if (x.speaker in renameDict) {
              renameDict[x.speaker] = x.paragraphUuid;
            }
            return x;
          })
          .chain(
            pastedSlice.map((x) => {
              if (x.speaker in renameDict) {
                return { ...x, paragraphUuid: renameDict[x.speaker] || x.paragraphUuid };
              } else {
                renameDict = {};
                return x;
              }
            })
          )
          .chain(afterSlice);
        state.document.content = new DocumentGenerator(chained).toParagraphs();
      }
    },
    rejected: (state, payload) => {
      console.error('paste rejected:', payload);
    },
  }
);

export const copySelectionText = createAsyncActionWithReducer<EditorState>(
  'editor/copySelectionText',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    const selection = state.selection;
    if (!selection) {
      return;
    }

    const filterFn = (item: DocumentGeneratorItem) =>
      item.absoluteStart >= selection.range.start &&
      item.absoluteStart + item.length <= selection.range.start + selection.range.length;
    const paragraphs = DocumentGenerator.fromParagraphs(state.document.content)
      .filter(filterFn)
      .toParagraphs();

    const selectionText = paragraphs
      .map((paragraph) => {
        let paragraphText = '';
        if (state.displaySpeakerNames) {
          paragraphText += `${paragraph.speaker}:\n`;
        }
        paragraphText += paragraph.content
          .filter((x) => x.type == 'word')
          .map((x) => (x as Word).word)
          .join(' ');
        return paragraphText;
      })
      .join('\n\n');

    clipboard.writeText(selectionText);
  }
);
