import { defaultEditorState, EditorState } from './types';
import { V3DocumentItem } from '../../core/document';
import {
  moveSelectionHeadLeft,
  moveSelectionHeadRight,
  moveSelectionHeadTo,
  selectAll,
  setSelection,
} from './selection';
import _ from 'lodash';
import { addUuids } from '../../util/test_helper';

const testContent: V3DocumentItem[] = addUuids([
  { type: 'speaker_change', speaker: 'paragraph_01', language: null },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'paragraph_break' },
  { type: 'speaker_change', speaker: 'paragraph_02', language: null },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'artificial_silence', length: 1 },
  { type: 'paragraph_break' },
]);

const testState: EditorState = _.cloneDeep(defaultEditorState);
testState.document.content = _.cloneDeep(testContent);

test('setSelection: head left', () => {
  const state = _.cloneDeep(testState);
  expect(state.selection).toBe(null);
  setSelection.reducer(state, { headPosition: 'left', startIndex: 0, length: 1 });
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('setSelection: head right', () => {
  const state = _.cloneDeep(testState);
  expect(state.selection).toBe(null);
  setSelection.reducer(state, { headPosition: 'right', startIndex: 0, length: 1 });
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 0, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('setSelection: null', () => {
  const state = _.cloneDeep(testState);
  state.selection = { headPosition: 'left', startIndex: 0, length: 1 };
  setSelection.reducer(state, null);
  expect(state.selection).toBe(null);
});

test('moveSelectionHeadLeft: no selection, selects item left of cursor', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('moveSelectionHeadLeft: selection (left head), extends to left', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  state.selection = { headPosition: 'left', startIndex: 3, length: 1 };
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('moveSelectionHeadLeft: no selection, does not select para break if met', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 1, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('moveSelectionHeadLeft: selection, does not select para break if met', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 1, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});
test('moveSelectionHeadLeft: right headed selection, shrinks selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  state.selection = { headPosition: 'right', startIndex: 2, length: 2 };
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveSelectionHeadLeft: right headed selection, eats selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  state.selection = { headPosition: 'right', startIndex: 2, length: 1 };
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test.each([1.1, 1.4, 1.5, 1.7, 2])(
  'moveSelectionHeadLeft: no selection, player time %d, selects to left',
  (playerTime) => {
    const state = _.cloneDeep(testState);
    state.cursor.current = 'player';
    state.cursor.playerTime = playerTime;
    moveSelectionHeadLeft.reducer(state);
    expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
    expect(state.cursor.current).toBe('user');
    expect(state.cursor.userIndex).toBe(2);
  }
);

test('moveSelectionHeadLeft: right selection, collapses without including para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  state.selection = { headPosition: 'right', startIndex: 1, length: 1 };
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('moveSelectionHeadLeft: at idx=0 is noop', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('moveSelectionHeadLeft: does not extend beyond document', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 1, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
  moveSelectionHeadLeft.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 1, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

// move head right

test('moveSelectionHeadRight: no selection, selects item right of cursor', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveSelectionHeadRight: selection (right head), extends to right', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'right', startIndex: 1, length: 1 };
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 1, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveSelectionHeadRight: no selection, para break is selected as own item', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 4, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadRight: selection over para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  state.selection = { headPosition: 'right', startIndex: 3, length: 1 };
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 3, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadRight: left headed selection, shrinks selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 2 };
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 3, length: 1 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveSelectionHeadRight: left headed selection, eats selection', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test.each([1, 1.1, 1.4, 1.5, 1.7])(
  'moveSelectionHeadRight: no selection, player time %d, selects to right',
  (playerTime) => {
    const state = _.cloneDeep(testState);
    state.cursor.current = 'player';
    state.cursor.playerTime = playerTime;
    moveSelectionHeadRight.reducer(state);
    expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
    expect(state.cursor.current).toBe('user');
    expect(state.cursor.userIndex).toBe(3);
  }
);

test('moveSelectionHeadRight: left selection, collapses without including para break', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'player';
  state.cursor.playerTime = 3;
  state.selection = { headPosition: 'left', startIndex: 3, length: 1 };
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(4);
});

test('moveSelectionHeadRight: multiple para breaks to right', () => {
  const state = _.cloneDeep(testState);
  state.document.content = addUuids([
    { type: 'speaker_change', speaker: 'paragraph_01', language: null },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'paragraph_break' },
    { type: 'speaker_change', speaker: 'paragraph_02', language: null },
    { type: 'paragraph_break' },
    { type: 'speaker_change', speaker: 'paragraph_03', language: null },
    { type: 'paragraph_break' },
    { type: 'speaker_change', speaker: 'paragraph_04', language: null },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'artificial_silence', length: 1 },
    { type: 'paragraph_break' },
  ]);
  state.cursor.current = 'player';
  state.cursor.playerTime = 2;
  moveSelectionHeadRight.reducer(state);
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 3, length: 2 });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadRight: does not extend beyond document', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 8;
  state.selection = { headPosition: 'right', startIndex: 7, length: 1 };
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({
    headPosition: 'right',
    startIndex: 7,
    length: 2,
  });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(9);
  moveSelectionHeadRight.reducer(state);
  expect(state.selection).toStrictEqual({
    headPosition: 'right',
    startIndex: 7,
    length: 2,
  });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(9);
});

// selectAll

test('selectAll', () => {
  const state = _.cloneDeep(testState);
  selectAll.reducer(state);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 0, length: 10 });
});

test('selectAll: empty document', () => {
  const state = _.cloneDeep(testState);
  state.document.content = [];
  selectAll.reducer(state);
  expect(state.selection).toBe(null);
});

//moveSelectionHeadTo

test('moveSelectionHeadTo: creates new selection if none exists (right)', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  moveSelectionHeadTo.reducer(state, 5);
  expect(state.selection).toStrictEqual({
    startIndex: 3,
    length: 2,
    headPosition: 'right',
  });

  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadTo: creates new selection if none exists (left)', () => {
  const state = _.cloneDeep(testState);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  moveSelectionHeadTo.reducer(state, 1);
  expect(state.selection).toStrictEqual({
    startIndex: 1,
    length: 2,
    headPosition: 'left',
  });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('moveSelectionHeadTo: grows selection (right)', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'right',
    startIndex: 1,
    length: 2,
  };
  moveSelectionHeadTo.reducer(state, 5);
  expect(state.selection).toStrictEqual({
    startIndex: 1,
    length: 4,
    headPosition: 'right',
  });

  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadTo: grows selection (left)', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'left',
    startIndex: 3,
    length: 2,
  };
  moveSelectionHeadTo.reducer(state, 1);
  expect(state.selection).toStrictEqual({
    startIndex: 1,
    length: 4,
    headPosition: 'left',
  });

  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('moveSelectionHeadTo: grow selection left to right', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'left',
    startIndex: 1,
    length: 2,
  };
  moveSelectionHeadTo.reducer(state, 5);
  expect(state.selection).toStrictEqual({
    startIndex: 3,
    length: 2,
    headPosition: 'right',
  });

  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadTo: grow selection right to left', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'right',
    startIndex: 3,
    length: 2,
  };
  moveSelectionHeadTo.reducer(state, 1);
  expect(state.selection).toStrictEqual({
    startIndex: 1,
    length: 2,
    headPosition: 'left',
  });
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('moveSelectionHeadTo: shrink selection (left)', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'left',
    startIndex: 1,
    length: 4,
  };
  moveSelectionHeadTo.reducer(state, 3);
  expect(state.selection).toStrictEqual({
    startIndex: 3,
    length: 2,
    headPosition: 'left',
  });

  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveSelectionHeadTo: shrink selection (right)', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'right',
    startIndex: 1,
    length: 4,
  };
  moveSelectionHeadTo.reducer(state, 3);
  expect(state.selection).toStrictEqual({
    startIndex: 1,
    length: 2,
    headPosition: 'right',
  });

  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('moveSelectionHeadTo: collapse (left)', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'left',
    startIndex: 1,
    length: 4,
  };
  moveSelectionHeadTo.reducer(state, 5);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('moveSelectionHeadTo: collapse (right)', () => {
  const state = _.cloneDeep(testState);
  state.selection = {
    headPosition: 'right',
    startIndex: 1,
    length: 4,
  };
  moveSelectionHeadTo.reducer(state, 1);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});
