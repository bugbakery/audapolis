// TODO:
//  - move head left/right
//  - player time
//    - beginning of word
//    - in first half
//    - at half
//    - second half
//  - user time
//    - at paragraph start (should include previous para_break)
//    - empty para
//  - set selection
//  - move over selection boundary
//  - cursor not at head postition

import { defaultEditorState, EditorState } from './types';
import { DocumentItem } from '../../core/document';
import {
  moveHeadLeft,
  moveHeadRight,
  selectAll,
  selectionIncludeFully,
  setSelection,
} from './selection';
import _ from 'lodash';

const testContent: DocumentItem[] = [
  { type: 'paragraph_break', speaker: 'paragraph_01' },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'paragraph_break', speaker: 'paragraph_02' },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
];

const testState: EditorState = _.cloneDeep(defaultEditorState);
testState.document.content = _.cloneDeep(testContent);

test('setSelection', () => {
  const state = _.cloneDeep(testState);
  expect(state.selection).toBe(null);
  setSelection.reducer(state, { headPosition: 'left', startIndex: 0, length: 1 });
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 1 });
});

test('moveHeadLeft: no selection, selects item left of cursor', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('moveHeadLeft: selection (left head), extends to left', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  state.selection = { headPosition: 'left', startIndex: 3, length: 1 };
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('moveHeadLeft: no selection, selects para break if met', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('moveHeadLeft: selection, selects para break if met', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 3 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('moveHeadLeft: right headed selection, shrinks selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  state.selection = { headPosition: 'right', startIndex: 2, length: 2 };
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveHeadLeft: right headed selection, eats selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  state.selection = { headPosition: 'right', startIndex: 2, length: 1 };
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test.each([1.1, 1.4, 1.5, 1.7, 2])(
  'moveHeadLeft: no selection, player time %d, selects to left',
  (playerTime) => {
    const state = _.cloneDeep(testState);
    state.cursor.current = 'player';
    state.cursor.playerTime = playerTime;
    moveHeadLeft.reducer(state);
    expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
    expect(state.cursor.current).toBe('user');
    expect(state.cursor.userIndex).toBe(2);
  }
);

test('moveHeadLeft: no selection, player time 1, includes para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('moveHeadLeft: right selection, collapses without including para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  state.selection = { headPosition: 'right', startIndex: 1, length: 1 };
  moveHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

// move head right

test('moveHeadRight: no selection, selects item right of cursor', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveHeadRight: selection (right head), extends to right', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'right', startIndex: 1, length: 1 };
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 1, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveHeadRight: no selection, para break is selected as own item', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 4, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveHeadRight: selection over para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  state.selection = { headPosition: 'right', startIndex: 3, length: 1 };
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 3, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveHeadRight: left headed selection, shrinks selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 2 };
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 3, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveHeadRight: left headed selection, eats selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test.each([1, 1.1, 1.4, 1.5, 1.7])(
  'moveHeadRight: no selection, player time %d, selects to right',
  (playerTime) => {
    const state = _.cloneDeep(testState);
    state.cursor.current = 'player';
    state.cursor.playerTime = playerTime;
    moveHeadRight.reducer(state);
    expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
    expect(state.cursor.current).toBe('user');
    expect(state.cursor.userIndex).toBe(3);
  }
);

test('moveHeadRight: no selection, player time 0 includes para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 0, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('moveHeadRight: left selection, collapses without including para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'player';
  state.cursor.playerTime = 3;
  state.selection = { headPosition: 'left', startIndex: 3, length: 1 };
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(4);
});

test('moveHeadRight: multiple para breaks to right', () => {
  const state = _.cloneDeep(testState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'paragraph_01' },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'paragraph_break', speaker: 'paragraph_02' },
    { type: 'paragraph_break', speaker: 'paragraph_03' },
    { type: 'paragraph_break', speaker: 'paragraph_04' },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 2;
  moveHeadRight.reducer(state);
  moveHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 3, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

// selectAll

test('selectAll', () => {
  const state = _.cloneDeep(testState);
  selectAll.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 8 });
});

test('selectAll: empty document', () => {
  const state = _.cloneDeep(testState);
  state.document.content = [];
  selectAll.reducer(state);
  expect(state.selection).toBe(null);
});

// selectionIncludeFully

test('selectionIncludeFully: right', () => {
  const state = _.cloneDeep(testState);
  state.selection = { headPosition: 'left', startIndex: 0, length: 2 };
  selectionIncludeFully.reducer(state, 4);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 0, length: 5 });
});

test('selectionIncludeFully: left', () => {
  const state = _.cloneDeep(testState);
  state.selection = { headPosition: 'left', startIndex: 4, length: 2 };
  selectionIncludeFully.reducer(state, 0);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 6 });
});

test('selectionIncludeFully: in selection', () => {
  const state = _.cloneDeep(testState);
  state.selection = { headPosition: 'left', startIndex: 4, length: 2 };
  selectionIncludeFully.reducer(state, 5);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 4, length: 2 });
});

test('selectionIncludeFully: no selection', () => {
  const state = _.cloneDeep(testState);
  state.selection = null;
  selectionIncludeFully.reducer(state, 2);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
});
