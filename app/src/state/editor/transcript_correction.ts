import { createActionWithReducer } from '../util';
import { EditorState } from './types';
import {
  currentIndex,
  renderItems,
  selectedItems,
  selectionSpansMultipleParagraphs,
} from './selectors';
import { toaster } from 'evergreen-ui';
import { moveSelectionHeadLeft, moveSelectionHeadRight } from './selection';
import {
  V3NonTextItem,
  V3TimedDocumentItem,
  TimedItemExtension,
  V3TextItem,
  UuidExtension,
} from '../../core/document';
import { deleteSelection } from './edit';
import _ from 'lodash';

export const startTranscriptCorrection = createActionWithReducer<EditorState, 'left' | 'right'>(
  'transcript_correction/startTranscriptCorrection',
  (state, direction) => {
    if (state.selection == null) {
      if (direction == 'right') {
        moveSelectionHeadRight.reducer(state);
      } else {
        moveSelectionHeadLeft.reducer(state);
      }
    }
    try {
      state.transcriptCorrectionState = getTranscriptCorrectionState(state);
      state.playing = false;
    } catch (e) {
      toaster.warning(e.message);
    }
  }
);

export const finishTranscriptCorrection = createActionWithReducer<EditorState>(
  'transcript_correction/finishTranscriptCorrection',
  (state) => {
    // this also validates the selection for the needed properties for transcript correction
    const noDifferenceSelectionState = getTranscriptCorrectionState(state);

    if (
      state.transcriptCorrectionState == null ||
      state.transcriptCorrectionState == noDifferenceSelectionState
    ) {
      state.transcriptCorrectionState = null;
      return;
    }

    const items = selectedItems(state);
    const selectionSourceItems = items.filter(
      (x): x is (V3TextItem | V3NonTextItem) & UuidExtension & TimedItemExtension =>
        x.type == 'text' || x.type == 'non_text'
    );
    const source = selectionSourceItems[0].source;
    const sourceStart = selectionSourceItems[0].sourceStart;
    const uuid = selectionSourceItems[0].uuid;
    const length = _.sum(selectionSourceItems.map((x) => x.length));

    deleteSelection.reducer(state);
    const newItem: (V3TextItem | V3NonTextItem) & UuidExtension =
      !state.transcriptCorrectionState.trim() // the selection is empty
        ? {
            type: 'non_text',
            sourceStart,
            length,
            source,
            uuid,
          }
        : {
            type: 'text',
            text: state.transcriptCorrectionState,
            sourceStart,
            length,
            source,
            conf: 1,
            uuid,
          };
    state.document.content.splice(currentIndex(state), 0, newItem);
    state.transcriptCorrectionState = null;
  }
);

function getTranscriptCorrectionState(state: EditorState): string {
  const items = selectedItems(state);
  if (selectionSpansMultipleParagraphs(state)) {
    throw Error(
      "transcript correction can't be performed on selections spanning multiple paragraphs."
    );
  }
  if (!isSameSourceAndContinuous(items)) {
    throw Error(
      'transcript correction can only be performed on selections that are continuous from the same audio source'
    );
  }
  return items
    .filter((x): x is V3TextItem & UuidExtension & TimedItemExtension => x.type == 'text')
    .map((x) => x.text)
    .join(' ');
}

function isSameSourceAndContinuous(items: V3TimedDocumentItem[]): boolean {
  return renderItems(items).length == 1;
}

export const abortTranscriptCorrection = createActionWithReducer<EditorState>(
  'transcript_correction/abortTranscriptCorrection',
  (state) => {
    state.transcriptCorrectionState = null;
  }
);

export const setTranscriptCorrectionText = createActionWithReducer<EditorState, string>(
  'transcript_correction/setText',
  (state, text) => {
    state.transcriptCorrectionState = text;
  }
);
