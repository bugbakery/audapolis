import { createActionWithReducer } from '../util';
import { EditorState } from './types';
import {
  currentIndex,
  renderItems,
  selectedItems,
  selectionSpansMultipleParagraphs,
} from './selectors';
import { toaster } from 'evergreen-ui';
import { moveSelectionHeadRight } from './selection';
import { Silence, TimedDocumentItem, TimedItemExtension, Word } from '../../core/document';
import { deleteSelection } from './edit';
import _ from 'lodash';

export const startTranscriptCorrection = createActionWithReducer<EditorState>(
  'transcript_correction/startTranscriptCorrection',
  (state) => {
    if (state.selection == null) {
      moveSelectionHeadRight.reducer(state);
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
      !state.transcriptCorrectionState ||
      !state.transcriptCorrectionState.trim() ||
      state.transcriptCorrectionState == noDifferenceSelectionState
    ) {
      state.transcriptCorrectionState = null;
      return;
    }

    const items = selectedItems(state);
    const selectionSoureItems = items.filter(
      (x): x is (Word | Silence) & TimedItemExtension => x.type == 'word' || x.type == 'silence'
    );
    const source = selectionSoureItems[0].source;
    const sourceStart = selectionSoureItems[0].sourceStart;
    const length = _.sum(selectionSoureItems.map((x) => x.length));

    deleteSelection.reducer(state);
    state.document.content.splice(currentIndex(state), 0, {
      type: 'word',
      word: state.transcriptCorrectionState,
      sourceStart,
      length,
      source,
      conf: 1,
    });
    state.transcriptCorrectionState = null;
  }
);

function getTranscriptCorrectionState(state: EditorState): string {
  const items = selectedItems(state);
  if (selectionSpansMultipleParagraphs(state)) {
    throw Error(
      "transcript correction can't be performed on selections spannig multiple paragraphs."
    );
  }
  if (!isSameSourceAndContinuous(items)) {
    throw Error(
      'transcript correction can only be performed on selections that are continuous from the same audio source'
    );
  }
  return items
    .filter((x): x is Word & TimedItemExtension => x.type == 'word')
    .map((x) => x.word)
    .join(' ');
}

function isSameSourceAndContinuous(items: TimedDocumentItem[]): boolean {
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
