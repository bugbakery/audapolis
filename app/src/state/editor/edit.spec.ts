import { defaultEditorState, EditorState } from './types';
import _ from 'lodash';
import {
  copy,
  copySelectionText,
  cut,
  deleteSelection,
  deleteSomething,
  insertParagraphBreak,
  paste,
  reassignParagraph,
  renameSpeaker,
  setWord,
} from './edit';
import { AsyncThunkAction } from '@reduxjs/toolkit/dist/createAsyncThunk';
import JSZip from 'jszip';
import { emptyDocument, serializeDocument, Document } from '../../core/document';
import { mocked } from 'jest-mock';
import { clipboard } from 'electron';
import { reducers } from './index';
import { AnyAction } from '@reduxjs/toolkit';

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
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  insertParagraphBreak.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(4);
});

test('insert paragraph break: before first para break, not at idx 0', () => {
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

test('delete selection with no selection is noop', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  deleteSelection.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.selection).toBe(null);
});

test('delete selection: 1 word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.selection = { startIndex: 0, length: 1, headPosition: 'left' };
  deleteSelection.reducer(state);
  expect(state.document.content).toStrictEqual([
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
  expect(state.selection).toBe(null);
});

test('delete selection: more words', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  state.selection = { startIndex: 0, length: 2, headPosition: 'left' };
  deleteSelection.reducer(state);
  expect(state.document.content).toStrictEqual([]);
  expect(state.selection).toBe(null);
});

test('set word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  setWord.reducer(state, { text: 'Word', absoluteIndex: 1 });
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Word', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
});

test('set word: idx is not a word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  expect(() => {
    setWord.reducer(state, { text: 'Word', absoluteIndex: 0 });
  }).toThrow(/not a word/i);
});

test('reassign paragraph', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  reassignParagraph.reducer(state, { newSpeaker: 'Speaker Two', absoluteIndex: 0 });
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
});

test('reassign paragraph: idx is not a para break', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ];
  expect(() => {
    reassignParagraph.reducer(state, { newSpeaker: 'Speaker Two', absoluteIndex: 1 });
  }).toThrow(/not a paragraph_break/i);
});

test('rename speaker', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  renameSpeaker.reducer(state, { newName: 'Speaker Two', oldName: 'Speaker One' });
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
});

test('rename speaker: more than one speaker in document', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  renameSpeaker.reducer(state, { newName: 'Speaker Three', oldName: 'Speaker One' });
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker Three' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
});

test('rename speaker: speaker not in document', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  renameSpeaker.reducer(state, { newName: 'Speaker Three', oldName: 'Speaker Ten' });
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
});

test('delete something: selection left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = {
    headPosition: 'left',
    startIndex: 1,
    length: 2,
  };
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
  expect(state.selection).toBe(null);
});

test('delete something: selection right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = {
    headPosition: 'left',
    startIndex: 1,
    length: 2,
  };
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
  expect(state.selection).toBe(null);
});

test('delete something: para break; left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
  expect(state.selection).toBe(null);
});

test('delete something: para break; right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(2);
  expect(state.selection).toBe(null);
});

test('delete something: word; left', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 1, length: 1 });
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('delete something: word; right', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 1, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('delete something: left at idx=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: right doesnt delete first para_break', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: left doesnt delete first para', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('delete something: right doesnt delete first para_break', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: left doesnt delete first para', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('delete something: word; left; player cursor at end of word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
});

test('delete something: word; right; player cursor at end of word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 3, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(3);
});

test('delete something: word; left; player cursor in word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0.5;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'left', startIndex: 1, length: 1 });
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('delete something: word; right; player cursor in word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0.5;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 1, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

test('delete something: left at t=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  deleteSomething.reducer(state, 'left');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.cursor.current).toBe('player');
  expect(state.cursor.userIndex).toBe(0);
});

test('delete something: right at t=0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual({ headPosition: 'right', startIndex: 1, length: 1 });
  deleteSomething.reducer(state, 'right');
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(state.selection).toBe(null);
  expect(state.cursor.current).toBe('user');
  expect(state.cursor.userIndex).toBe(1);
});

const mockedSerializeDocument = mocked(serializeDocument);
jest.mock('../../core/document', () => {
  const originalModule = jest.requireActual('../../core/document');

  return {
    __esModule: true,
    ...originalModule,
    serializeDocument: jest.fn(() => new JSZip()),
  };
});

jest.mock('electron', () => {
  const originalModule = jest.requireActual('electron');
  return {
    __esModule: true,
    ...originalModule,
    clipboard: {
      ...originalModule.clipboard,
      writeBuffer: jest.fn(() => {}),
      writeText: jest.fn(() => {}),
    },
  };
});
const mockedWriteText = mocked(clipboard.writeText);

/**
 * Calls an async thunk and handles oll the side effects in the same Promise.
 * Awaiting the returned promise ensures all properly awaited side effects are done.
 * @param thunk the thunk to test
 * @param state the current state. this will likely be mutated.
 */
async function runAsyncThunkSync(
  thunk: AsyncThunkAction<any, any, any>,
  state: EditorState
): Promise<void> {
  const dispatch = async (action: AnyAction | AsyncThunkAction<any, any, any>) => {
    if (typeof action == 'function') {
      await runAsyncThunkSync(action, state);
    } else {
      reducers.forEach((reducer) => {
        reducer.handleAction(state, action);
      });
    }
  };

  const getState = () => ({ editor: { present: _.cloneDeep(state) } });
  const returned = await thunk(dispatch, getState, {});
  dispatch(returned);
}

afterEach(() => {
  jest.clearAllMocks();
});
test('copy', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 0, length: 2 };
  await runAsyncThunkSync(copy(), state);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  expect(mockedSerializeDocument.mock.calls[0][0]).toMatchObject({
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    ],
  });
  expect(clipboard.writeBuffer).toHaveBeenCalled();
});

test('copy adds para-break before first word', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  await runAsyncThunkSync(copy(), state);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  expect(mockedSerializeDocument.mock.calls[0][0]).toMatchObject({
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    ],
  });
  expect(clipboard.writeBuffer).toHaveBeenCalled();
});

test('copy does nothing if no selection', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = null;
  await runAsyncThunkSync(copy(), state);
  expect(mockedSerializeDocument).not.toHaveBeenCalled();
  expect(clipboard.writeBuffer).not.toHaveBeenCalled();
});

test('cut', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 0, length: 2 };
  await runAsyncThunkSync(cut(), state);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  expect(mockedSerializeDocument.mock.calls[0][0]).toMatchObject({
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    ],
  });
  expect(clipboard.writeBuffer).toHaveBeenCalled();
});

test('cut adds para-break before first word', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  await runAsyncThunkSync(cut(), state);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  expect(mockedSerializeDocument.mock.calls[0][0]).toMatchObject({
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    ],
  });
  expect(clipboard.writeBuffer).toHaveBeenCalled();
});

test('cut does nothing if no selection', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = null;
  await runAsyncThunkSync(cut(), state);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);
  expect(mockedSerializeDocument).not.toHaveBeenCalled();
  expect(clipboard.writeBuffer).not.toHaveBeenCalled();
});

// TODO: should we test the paste payload creator?

test('paste nothing is noop', async () => {
  const state = _.cloneDeep(defaultEditorState);
  const pastedDocument = { content: [], sources: {} };
  expect(paste.reducers?.fulfilled).not.toBe(undefined);
  if (paste.reducers?.fulfilled == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }
  paste.reducers?.fulfilled(state, pastedDocument);
  expect(state.document).toStrictEqual(emptyDocument);
});

test('paste with missing sources fails', async () => {
  const state = _.cloneDeep(defaultEditorState);
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {},
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }
  expect(() => {
    reducer(state, pastedDocument);
  }).toThrow('missing source');
  expect(state.document).toStrictEqual(emptyDocument);
});

test('paste without leading para break fails', async () => {
  const state = _.cloneDeep(defaultEditorState);
  const pastedDocument: Document = {
    content: [
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }
  expect(() => {
    reducer(state, pastedDocument);
  }).toThrow('missing paragraph break');
  expect(state.document).toStrictEqual(emptyDocument);
});

test('paste minimal', async () => {
  const state = _.cloneDeep(defaultEditorState);
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste more complex', async () => {
  const state = _.cloneDeep(defaultEditorState);
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'Two', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
      { type: 'word', word: 'Two', conf: 1, source: 'source-2', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
      'source-2': {
        objectUrl: 'blob://source-2',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }
  reducer(state, pastedDocument);
  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'word', word: 'Two', conf: 1, source: 'source-2', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
    'source-2': {
      objectUrl: 'blob://source-2',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste: unnamed empty paragraph', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [{ type: 'paragraph_break', speaker: null }];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste: unnamed empty paragraph at idx=0', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [{ type: 'paragraph_break', speaker: null }];
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste: named empty paragraph', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [{ type: 'paragraph_break', speaker: 'Speaker One' }];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste: existing data', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Test', conf: 1, source: 'source-non', sourceStart: 0, length: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Test', conf: 1, source: 'source-non', sourceStart: 0, length: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste: pasting directly after a para break generates a new para break after the pasted content', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Test', conf: 1, source: 'source-non', sourceStart: 0, length: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Test', conf: 1, source: 'source-non', sourceStart: 0, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('paste: replaces selection', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  state.selection = { headPosition: 'left', startIndex: 2, length: 2 };
  const pastedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
  };
  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, pastedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ]);
  expect(state.document.sources).toStrictEqual({
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  });
});

test('copy&paste roundtrips', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.document.sources = {
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  };
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  await runAsyncThunkSync(copy(), state);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  const copiedDocument: Document = mockedSerializeDocument.mock.calls[0][0];

  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, copiedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
});

test('copy&paste roundtrips at start of para', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.document.sources = {
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  };
  state.selection = { headPosition: 'left', startIndex: 0, length: 2 };
  await runAsyncThunkSync(copy(), state);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  const copiedDocument: Document = mockedSerializeDocument.mock.calls[0][0];

  const reducer = paste.reducers?.fulfilled;

  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }
  reducer(state, copiedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
});

test('paste: merges paras if same speaker name', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.document.sources = {
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  };
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;

  const copiedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'Pasted One', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    ],
    sources: {},
  };

  const reducer = paste.reducers?.fulfilled;
  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, copiedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Pasted One', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
});

test('paste: merges paras if same speaker name', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ];
  state.document.sources = {
    'source-1': {
      objectUrl: 'blob://source-1',
      fileContents: new ArrayBuffer(0),
    },
  };
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;

  const copiedDocument: Document = {
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'Pasted One', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    ],
    sources: {},
  };

  const reducer = paste.reducers?.fulfilled;
  expect(reducer).not.toBe(undefined);
  if (reducer == undefined) {
    throw new Error('paste.reducers.fulfilled must be a function');
  }

  reducer(state, copiedDocument);

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Pasted One', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'word', word: 'Three', length: 1, source: 'source-1', sourceStart: 4, conf: 1 },
  ]);
  expect(state.selection).toStrictEqual(null);
});

test('copySelectionText', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Something Something' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 0, length: 1 },
    { type: 'word', word: 'Two', conf: 1, source: 'source-2', sourceStart: 1, length: 1 },
    { type: 'word', word: 'Three Four', conf: 1, source: 'source-1', sourceStart: 2, length: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Five', conf: 1, source: 'source-2', sourceStart: 0, length: 1 },
    { type: 'word', word: 'Six', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'word', word: 'Seven Eight', conf: 1, source: 'source-2', sourceStart: 2, length: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Three' },
    { type: 'word', word: 'Something', conf: 1, source: 'source-4', sourceStart: 0, length: 1 },
    { type: 'word', word: 'Something', conf: 1, source: 'source-4', sourceStart: 1, length: 1 },
  ];
  state.selection = {
    headPosition: 'left',
    startIndex: 1,
    length: 15,
  };
  state.displaySpeakerNames = true;

  await runAsyncThunkSync(copySelectionText(), state);

  expect(mockedWriteText).toHaveBeenCalledTimes(1);
  expect(mockedWriteText).toHaveBeenCalledWith(
    'Speaker One:\n' +
      'One Two Three Four\n' +
      '\n' +
      'Speaker Two:\nFive Six Seven Eight\n' +
      '\n' +
      'Speaker Two:\n\n' +
      'Speaker Three:\nSomething Something'
  );
});

test('copySelectionText: null speaker, no content', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [{ type: 'paragraph_break', speaker: null }];
  state.selection = {
    headPosition: 'left',
    startIndex: 0,
    length: 1,
  };

  await runAsyncThunkSync(copySelectionText(), state);

  expect(mockedWriteText).toHaveBeenCalledTimes(1);
  expect(mockedWriteText).toHaveBeenCalledWith('');
});

test('copySelectionText: null speaker, text', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: null },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 0, length: 1 },
  ];
  state.selection = {
    headPosition: 'left',
    startIndex: 0,
    length: 2,
  };

  await runAsyncThunkSync(copySelectionText(), state);

  expect(mockedWriteText).toHaveBeenCalledTimes(1);
  expect(mockedWriteText).toHaveBeenCalledWith('One');
});

test('copySelectionText: no selection', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: null },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 0, length: 1 },
  ];
  state.selection = null;

  await runAsyncThunkSync(copySelectionText(), state);

  expect(mockedWriteText).toHaveBeenCalledTimes(0);
});
