import { defaultEditorState } from './types';
import _ from 'lodash';
import {
  deleteSelection,
  deleteSomething,
  insertParagraphBreak,
  reassignParagraph,
  renameSpeaker,
  setWord,
} from './edit';

test('insert paragraph break user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('insert paragraph break: player cursor in first 50%', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1.2;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('insert paragraph break: player cursor in last 50%', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1.75;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(4);
});

test('insert paragraph break: non-word item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', text: 'H1', level: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', text: 'H1', level: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(5);
});

test('insert paragraph break: before first para break, not at idx 0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: null },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('insert paragraph break: before first para break, at idx 0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: null },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('insert paragraph break: before first para break', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: null },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete selection with no selection is noop', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  deleteSelection.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.selection).toBe(null);
});

test('delete selection: 1 word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.selection = { startIndex: 1, length: 1, headPosition: 'left' };
  deleteSelection.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.selection).toBe(null);
});

test('delete selection: more words', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.selection = { startIndex: 1, length: 2, headPosition: 'left' };
  deleteSelection.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
  ]);
  expect(state.selection).toBe(null);
});

test('set word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  setWord.reducer(state, { text: 'Word', absoluteIndex: 2 });
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Word', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
});

test('set word: idx is not a word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  expect(() => {
    setWord.reducer(state, { text: 'Word', absoluteIndex: 1 });
  }).toThrow(/not a word/i);
});

test('reassign paragraph', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  reassignParagraph.reducer(state, { newSpeaker: 'Speaker Two', absoluteIndex: 1 });
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
});

test('reassign paragraph: idx is not a word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  expect(() => {
    reassignParagraph.reducer(state, { newSpeaker: 'Speaker Two', absoluteIndex: 2 });
  }).toThrow(/not a paragraph_break/i);
});

test('rename speaker', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  renameSpeaker.reducer(state, { newName: 'Speaker Two', oldName: 'Speaker One' });
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
});

test('rename speaker: more than one speaker in document', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  renameSpeaker.reducer(state, { newName: 'Speaker Three', oldName: 'Speaker One' });
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Three' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
});

test('rename speaker: speaker not in document', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  renameSpeaker.reducer(state, { newName: 'Speaker Three', oldName: 'Speaker Ten' });
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
});

test('delete something: selection left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = {
    headPosition: 'left',
    startIndex: 2,
    length: 2,
  };
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
  expect(state.selection).toBe(null);
});

test('delete something: selection right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = {
    headPosition: 'left',
    startIndex: 2,
    length: 2,
  };
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
  expect(state.selection).toBe(null);
});

test('delete something: para break; left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
  expect(state.selection).toBe(null);
});

test('delete something: para break; right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
  expect(state.selection).toBe(null);
});

test('delete something: word; left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete something: word; right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete something: heading; left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete something: heading; right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete something: left at idx=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: right at idx=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: null },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: word; left; player cursor at end of word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
});

test('delete something: word; right; player cursor at end of word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 4, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(4);
});

test('delete something: word; left; player cursor in word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0.5;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 2, length: 1 });
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete something: word; right; player cursor in word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0.5;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 2, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
});

test('delete something: left at t=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: null },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: right at t=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 1, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toBe(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});
