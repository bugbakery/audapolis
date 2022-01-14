import { assertSome } from '../../util';
import { v4 as uuidv4 } from 'uuid';
import {
  deserializeDocument,
  Document,
  DocumentGenerator,
  DocumentGeneratorItem,
  serializeDocument,
  TimedParagraphItem,
  Word,
} from '../../core/document';
import { clipboard } from 'electron';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { EditorState } from './types';
import { selectLeft } from './selection';
import { setUserSetTime } from './play';

export const insertParagraphBreak = createActionWithReducer<EditorState>(
  'editor/insertParagraphBreak',
  (state) => {
    const newUuid = uuidv4();
    let prevUuid = '';
    const splitParagraphs = (item: DocumentGeneratorItem): DocumentGeneratorItem => {
      if (item.paragraphUuid == prevUuid && item.absoluteStart >= state.currentTimePlayer) {
        item.paragraphUuid = newUuid;
      } else if (item.absoluteStart < state.currentTimePlayer) {
        prevUuid = item.paragraphUuid;
      }
      return item;
    };

    state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
      .itemMap(splitParagraphs)
      .toParagraphs();
  }
);

export const deleteParagraphBreak = createActionWithReducer<EditorState>(
  'editor/deleteParagraphBreak',
  (state) => {
    let parUuid: string | null = null;
    let prevUuid = '';
    const mergeParagraphs = (item: DocumentGeneratorItem): DocumentGeneratorItem => {
      if (item.absoluteStart < state.currentTimePlayer) {
        prevUuid = item.paragraphUuid;
      } else if (parUuid === null || item.paragraphUuid === parUuid) {
        parUuid = item.paragraphUuid;
        item.paragraphUuid = prevUuid;
      }
      return item;
    };
    state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
      .itemMap(mergeParagraphs)
      .toParagraphs();
  }
);

export const deleteSelection = createActionWithReducer<EditorState>(
  'editor/deleteSelection',
  (state) => {
    const selection = state.selection;
    if (!selection) {
      throw new Error('selection is null');
    }
    const isNotSelected = (item: TimedParagraphItem) => {
      return !(
        item.absoluteStart >= selection.range.start &&
        item.absoluteStart + item.length <= selection.range.start + selection.range.length
      );
    };
    state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
      .filter(isNotSelected)
      .toParagraphs();
    setUserSetTime.reducer(state, selection.range.start);
    state.selection = null;
  }
);

export const setWord = createActionWithReducer<
  EditorState,
  { absoluteStart: number; text: string }
>('editor/setWord', (state, payload) => {
  state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
    .itemMap((item) =>
      item.absoluteStart == payload.absoluteStart && item.type == 'word'
        ? { ...item, word: payload.text }
        : item
    )
    .toParagraphs();
});

export const reassignParagraph = createActionWithReducer<
  EditorState,
  { paragraphIdx: number; newSpeaker: string }
>('editor/reassignParagraph', (state, payload) => {
  const { paragraphIdx, newSpeaker } = payload;

  state.document.content = state.document.content.map((paragraph, i) => {
    if (i === paragraphIdx) {
      return { ...paragraph, speaker: newSpeaker };
    } else {
      return paragraph;
    }
  });
});

export const renameSpeaker = createActionWithReducer<
  EditorState,
  { oldName: string; newName: string }
>('editor/renameSpeaker', (state, payload) => {
  const { oldName, newName } = payload;

  state.document.content = state.document.content.map((paragraph) => {
    if (paragraph.speaker === oldName) {
      return { ...paragraph, speaker: newName };
    } else {
      return paragraph;
    }
  });
});

export const deleteSomething = createActionWithReducer<EditorState>(
  'editor/deleteSomething',
  async (state) => {
    if (state.selection !== null) {
      deleteSelection.reducer(state);
    } else {
      const items = DocumentGenerator.fromParagraphs(state.document.content).getItemsAtTime(
        state.currentTimePlayer
      );
      if (items[items.length - 1].itemIdx == 0) {
        deleteParagraphBreak.reducer(state);
      } else {
        selectLeft.reducer(state);
      }
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
    await dispatch(deleteSelection());
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
      const beforeSlice = DocumentGenerator.fromParagraphs(state.document.content).filter(
        (item) => item.absoluteStart + item.length <= state.currentTimePlayer
      );
      const pastedSlice = DocumentGenerator.fromParagraphs(payload.content);
      const afterSlice = DocumentGenerator.fromParagraphs(state.document.content).filter(
        (item) => item.absoluteStart + item.length > state.currentTimePlayer
      );

      state.document.content = beforeSlice.chain(pastedSlice).chain(afterSlice).toParagraphs();
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
