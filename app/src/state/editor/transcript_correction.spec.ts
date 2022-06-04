import { V3DocumentItem } from '../../core/document';
import { defaultEditorState, EditorState } from './types';
import _ from 'lodash';
import { finishTranscriptCorrection, startTranscriptCorrection } from './transcript_correction';
import { mocked } from 'jest-mock';
import { toaster } from 'evergreen-ui';
import { addUuids } from '../../util/test_helper';

const testContent: V3DocumentItem[] = addUuids([
  { type: 'speaker_change', speaker: 'Speaker One', language: null },
  { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'non_text', source: 'source-1', sourceStart: 5, length: 1 },
  { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'paragraph_break' },
  { type: 'speaker_change', speaker: 'Speaker Two', language: null },
  { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'Two', conf: 1 },
  { type: 'artificial_silence', length: 10 },
  { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-3', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'paragraph_break' },
]);

function getState(): EditorState {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  return state;
}

const mockedWarning = mocked(toaster.warning);
jest.mock('evergreen-ui', () => {
  const originalModule = jest.requireActual('evergreen-ui');

  return {
    __esModule: true,
    ...originalModule,
    toaster: {
      warning: jest.fn(() => {}),
    },
  };
});

test('startTranscriptCorrection selects left', () => {
  const state = getState();
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  startTranscriptCorrection.reducer(state, 'left');
  expect(state.selection).toStrictEqual({
    startIndex: 1,
    length: 1,
    headPosition: 'left',
  });
  expect(state.transcriptCorrectionState).toStrictEqual('One');
});

test('startTranscriptCorrection selects right', () => {
  const state = getState();
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  startTranscriptCorrection.reducer(state, 'right');
  expect(state.selection).toStrictEqual({
    startIndex: 2,
    length: 1,
    headPosition: 'right',
  });
  expect(state.transcriptCorrectionState).toStrictEqual('Two');
});

test('startTranscriptCorrection warns if selection spans multiple paragraphs', () => {
  const state = getState();
  state.selection = {
    startIndex: 2,
    length: 10,
    headPosition: 'left',
  };
  const stateClone = _.cloneDeep(state);
  startTranscriptCorrection.reducer(state, 'left');
  expect(state).toStrictEqual(stateClone);
  expect(mockedWarning).toHaveBeenCalled();
});

test('startTranscriptCorrection warns if selection spans multiple sources', () => {
  const state = getState();
  state.selection = {
    startIndex: 6,
    length: 2,
    headPosition: 'left',
  };
  const stateClone = _.cloneDeep(state);
  startTranscriptCorrection.reducer(state, 'left');
  expect(state).toStrictEqual(stateClone);
  expect(mockedWarning).toHaveBeenCalled();
});

test('startTranscriptCorrection warns if selection is non continuous in source', () => {
  const state = getState();
  state.selection = {
    startIndex: 9,
    length: 2,
    headPosition: 'left',
  };
  const stateClone = _.cloneDeep(state);
  startTranscriptCorrection.reducer(state, 'left');
  expect(state).toStrictEqual(stateClone);
  expect(mockedWarning).toHaveBeenCalled();
});

test('startTranscriptCorrection warns if paragraph_break is selected', () => {
  const state = getState();
  state.selection = {
    startIndex: 5,
    length: 2,
    headPosition: 'left',
  };
  const stateClone = _.cloneDeep(state);
  startTranscriptCorrection.reducer(state, 'left');
  expect(state).toStrictEqual(stateClone);
  expect(mockedWarning).toHaveBeenCalled();
});

test('startTranscriptCorrection sets transcriptCorrectionState', () => {
  const state = getState();
  state.selection = {
    startIndex: 1,
    length: 3,
    headPosition: 'left',
  };
  startTranscriptCorrection.reducer(state, 'left');
  expect(state.transcriptCorrectionState).toStrictEqual('One Two Three');
  expect(mockedWarning).toHaveBeenCalled();
});

test('finishTranscriptCorrection does nothing if nothing changed', () => {
  const state = getState();
  const documentSave = _.cloneDeep(state.document);
  state.selection = {
    startIndex: 1,
    length: 3,
    headPosition: 'left',
  };
  state.transcriptCorrectionState = 'One Two Three';
  finishTranscriptCorrection.reducer(state);
  expect(state.document).toStrictEqual(documentSave);
});

test('finishTranscriptCorrection changes document', () => {
  const state = getState();
  state.selection = {
    startIndex: 1,
    length: 3,
    headPosition: 'left',
  };
  state.transcriptCorrectionState = 'One Three Two';
  finishTranscriptCorrection.reducer(state);
  expect(state.transcriptCorrectionState).toStrictEqual(null);
  expect(state.document.content).toMatchObject([
    { type: 'speaker_change', speaker: 'Speaker One', language: null },
    { type: 'text', source: 'source-1', sourceStart: 2, length: 3, text: 'One Three Two', conf: 1 },
    { type: 'non_text', source: 'source-1', sourceStart: 5, length: 1 },
    { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
    { type: 'paragraph_break' },
    { type: 'speaker_change', speaker: 'Speaker Two', language: null },
    { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
    { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'Two', conf: 1 },
    { type: 'artificial_silence', length: 10 },
    { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
    { type: 'text', source: 'source-3', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
    { type: 'paragraph_break' },
  ]);
});

test('finishTranscriptCorrection changes document', () => {
  const state = getState();
  state.selection = {
    startIndex: 1,
    length: 4,
    headPosition: 'left',
  };
  state.transcriptCorrectionState = 'One Three Two';
  finishTranscriptCorrection.reducer(state);
  expect(state.transcriptCorrectionState).toStrictEqual(null);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'text', source: 'source-1', sourceStart: 2, length: 4, text: 'One Three Two', conf: 1 },
    { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
    { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'Two', conf: 1 },
    { type: 'artificial_silence', length: 10 },
    { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
    { type: 'text', source: 'source-3', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  ]);
});

test('finishTranscriptCorrection creates silence when correction is empty', () => {
  const state = getState();
  state.selection = {
    startIndex: 1,
    length: 4,
    headPosition: 'left',
  };
  state.transcriptCorrectionState = '';
  finishTranscriptCorrection.reducer(state);
  expect(state.transcriptCorrectionState).toStrictEqual(null);
  expect(state.document.content).toMatchObject([
    { type: 'speaker_change', speaker: 'Speaker One', language: null },
    { type: 'non_text', source: 'source-1', sourceStart: 2, length: 4 },
    { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
    { type: 'paragraph_break' },
    { type: 'speaker_change', speaker: 'Speaker Two', language: null },
    { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
    { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'Two', conf: 1 },
    { type: 'artificial_silence', length: 10 },
    { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
    { type: 'text', source: 'source-3', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
    { type: 'paragraph_break' },
  ]);
});
