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
    const isNotSelected = (item: TimedV1ParagraphItem) => {
      return !(
        item.absoluteStart >= selection.range.start &&
        item.absoluteStart + item.length <= selection.range.start + selection.range.length
      );
    };
    const items = getItemsAtTime(
      DocumentGenerator.fromParagraphs(state.document.content),
      selection.range.start + selection.range.length
    );
    state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
      .filter(isNotSelected)
      .toParagraphs();

    setUserSetTime.reducer(state, selection.range.start - (items[0].lastInParagraph ? EPSILON : 0));
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
