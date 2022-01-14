import { assertSome, EPSILON } from '../../util';
import { DocumentGenerator, getDocumentDuration, TimedParagraphItem } from '../../core/document';
import { createActionWithReducer } from '../util';
import { EditorState, Selection } from './types';

export const setSelection = createActionWithReducer<EditorState, Selection | null>(
  'editor/setSelection',
  (state, payload) => {
    state.selection = payload;
  }
);

export const selectLeft = createActionWithReducer<EditorState>('editor/selectLeft', (state) => {
  const selectionInfo = getSelectionInfo(state.selection);
  const getItemLeft = (time: number) =>
    DocumentGenerator.fromParagraphs(state.document.content).getItemsAtTime(time)[0];
  if (!selectionInfo || !state.selection) {
    const item = getItemLeft(state.currentTimePlayer);
    assertSome(item);
    state.selection = {
      range: { start: item.absoluteStart, length: item.length },
      startItem: item,
    };
  } else {
    const { leftEnd, rightEnd, currentEndLeft } = selectionInfo;
    if (currentEndLeft) {
      const item = getItemLeft(leftEnd);
      assertSome(item);
      state.selection.range.length = rightEnd - item.absoluteStart;
      state.selection.range.start = item.absoluteStart;
    } else {
      const item = getItemLeft(rightEnd);
      assertSome(item);
      state.selection.range.length = item.absoluteStart - leftEnd;
    }
  }
});

export const selectRight = createActionWithReducer<EditorState>('editor/selectRight', (state) => {
  const selectionInfo = getSelectionInfo(state.selection);
  const getItemRight = (time: number) => {
    const items = DocumentGenerator.fromParagraphs(state.document.content).getItemsAtTime(time);
    return items[items.length - 1];
  };
  if (!selectionInfo || !state.selection) {
    let item = getItemRight(state.currentTimePlayer);

    // this is special handling for the case where we are at the end of a paragraph
    // and position the cursor -EPSILON from the end of the item
    if (item.absoluteStart + item.length - state.currentTimePlayer < 2 * EPSILON) {
      item = getItemRight(item.absoluteStart + item.length);
    }

    state.selection = {
      range: { start: item.absoluteStart, length: item.length },
      startItem: item,
    };
  } else {
    const { leftEnd, rightEnd, currentEndRight } = selectionInfo;
    if (currentEndRight) {
      const item = getItemRight(rightEnd);
      const itemEnd = item.absoluteStart + item.length;
      state.selection.range.length = itemEnd - leftEnd;
    } else {
      const item = getItemRight(leftEnd);
      const itemEnd = item.absoluteStart + item.length;
      state.selection.range.length = rightEnd - itemEnd;
      state.selection.range.start = itemEnd;
    }
  }
});

export const selectAll = createActionWithReducer<EditorState>('editor/selectAll', (state) => {
  assertSome(state);
  const item = DocumentGenerator.fromParagraphs(state.document.content).getItemsAtTime(0)[0];
  assertSome(item);
  state.selection = {
    range: { start: 0, length: getDocumentDuration(state.document.content) },
    startItem: item,
  };
});

export const selectionIncludeFully = createActionWithReducer<EditorState, TimedParagraphItem>(
  'editor/selectionIncludeFully',
  (state, payload) => {
    assertSome(state);
    if (!state.selection) {
      state.selection = {
        range: { start: payload.absoluteStart, length: payload.length },
        startItem: payload,
      };
    } else {
      if (state.selection.range.start == state.selection.startItem.absoluteStart) {
        if (payload.absoluteStart >= state.selection.range.start) {
          state.selection.range.length =
            payload.absoluteStart + payload.length - state.selection.range.start;
        } else {
          state.selection.range = {
            start: payload.absoluteStart,
            length:
              state.selection.startItem.absoluteStart +
              state.selection.startItem.length -
              payload.absoluteStart,
          };
        }
      } else {
        if (
          payload.absoluteStart + payload.length <=
          state.selection.range.start + state.selection.range.length
        ) {
          state.selection.range.length =
            state.selection.range.start + state.selection.range.length - payload.absoluteStart;
          state.selection.range.start = payload.absoluteStart;
        } else {
          state.selection.range = {
            start: state.selection.startItem.absoluteStart,
            length:
              payload.absoluteStart + payload.length - state.selection.startItem.absoluteStart,
          };
        }
      }
    }
  }
);

function getSelectionInfo(
  selection: Selection | null
): { currentEndRight: boolean; currentEndLeft: boolean; leftEnd: number; rightEnd: number } | null {
  if (selection) {
    const startDifference = Math.abs(selection.startItem.absoluteStart - selection.range.start);
    const selectionStartItemEnd = selection.startItem.absoluteStart + selection.startItem.length;
    const selectionEnd = selection.range.start + selection.range.length;
    const endDifference = Math.abs(selectionStartItemEnd - selectionEnd);
    return {
      leftEnd: selection.range.start,
      rightEnd: selection.range.start + selection.range.length,
      currentEndRight: startDifference < EPSILON,
      currentEndLeft: endDifference < EPSILON,
    };
  } else {
    return null;
  }
}
