import { defaultEditorState } from './types';
import _ from 'lodash';
import {
  copy,
  copySelectionText,
  deleteSelection,
  deleteSomething,
  insertParagraphBreak,
  paste,
  reassignParagraph,
  renameSpeaker,
  setWord,
} from './edit';
import { AsyncThunkPayloadCreator } from '@reduxjs/toolkit/dist/createAsyncThunk';
import JSZip from 'jszip';
import { emptyDocument, serializeDocument, Document } from '../../core/document';
import { mocked } from 'jest-mock';
import { clipboard } from 'electron';
import { AsyncActionWithReducers } from '../util';
import { RootState, store } from '../index';

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

const mockedSerializeDocument = mocked(serializeDocument);
jest.mock('../../core/document', () => {
  const originalModule = jest.requireActual('../../core/document');

  //Mock the default export and named export 'foo'
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
async function runPayloadCreator<ThunkArg, Returned>(
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, { state: RootState }>,
  state: RootState,
  arg: any
) {
  const handler = {
    get: function (target: any, prop: string | symbol) {
      if (prop in target) {
        return target[prop];
      }
      throw new Error(`Trying to access property '${String(prop)}' on fake thunkApi`);
    },
  };
  // const editorReducers = Object.values(editReducers);
  const thunkApi = new Proxy(
    {
      getState: (): RootState => state,
      // dispatch: async (
      //   action:
      //     | { type: string; payload: never }
      //     | ((dispatch: () => never, getState: () => RootState) => void)
      // ) => {
      //   if (typeof action == 'function') {
      //     return action(
      //       () => {
      //         throw new Error('TODO: dispatch');
      //       },
      //       (): RootState => state
      //     );
      //   }
      //   let { type, payload } = action;
      //   console.log('dispatch called with', arguments);
      //   if (!type) {
      //     console.log('no type');
      //   }
      //   console.log('dispatching', type, 'with payload', payload);
      //   console.log('reducers', reducers);
      //   state.editor.present = await produce(
      //     state.editor.present || defaultEditorState,
      //     async (state: EditorState) => {
      //       for (const reducer of editorReducers) {
      //         if (
      //           ('type' in reducer && reducer.type == type) ||
      //           ('typePrefix' in reducer && reducer.typePrefix == type)
      //         ) {
      //           console.log('FOUND', type, reducer);
      //           if ('payloadCreator' in reducer) {
      //             console.log('FOUND PAYLOAD CREATOR', type);
      //             await runPayloadCreator(reducer.payloadCreator, state, payload);
      //           }
      //           if ('reducer' in reducer) {
      //             console.log('running reducer', reducer, type);
      //             reducer.reducer(state, payload);
      //           } else {
      //             throw new Error(`'${type}' was not created using createActionWithReducer`);
      //           }
      //         }
      //       }
      //     }
      //   );
      // },
    },
    handler
  );
  return payloadCreator(arg, thunkApi);
}
async function runAsyncAction<StateSlice, Returned, ThunkArg>(
  thunk: AsyncActionWithReducers<StateSlice, Returned, ThunkArg>,
  stateModifier: (state: RootState) => void,
  arg?: any
): Promise<RootState> {
  const state: RootState = _.cloneDeep(store.getState());
  stateModifier(state);

  await runPayloadCreator(thunk.payloadCreator, state, arg);
  return state;
}
//
// async function runAsyncActionWithEditorState<StateSlice, Returned, ThunkArg>(
//   thunk: AsyncActionWithReducers<StateSlice, Returned, ThunkArg>,
//   state: EditorState,
//   arg?: any
// ): Promise<EditorState | null> {
//   const newRootState = await runAsyncAction(
//     thunk,
//     (initialState) => (initialState.editor.present = state),
//     arg
//   );
//   return newRootState.editor.present;
// }

afterEach(() => {
  jest.clearAllMocks();
});
test('copy', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 0, length: 2 };
  await runAsyncAction(copy, (initialState) => (initialState.editor.present = state));

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
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
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
  await runAsyncAction(copy, (initialState) => (initialState.editor.present = state));

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
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

test('copy adds para break if selections end in heading', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 0, length: 3 };
  await runAsyncAction(copy, (initialState) => (initialState.editor.present = state));

  expect(state.document.content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ]);

  expect(mockedSerializeDocument).toHaveBeenCalledTimes(1);
  expect(mockedSerializeDocument.mock.calls[0].length).toBe(1);
  expect(mockedSerializeDocument.mock.calls[0][0]).toMatchObject({
    content: [
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
      { type: 'heading', level: 1, text: 'Heading One' },
      { type: 'paragraph_break', speaker: null },
    ],
  });
  expect(clipboard.writeBuffer).toHaveBeenCalled();
});

test('copy does nothing if no selection', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = null;
  await runAsyncAction(copy, (initialState) => (initialState.editor.present = state));
  expect(mockedSerializeDocument).not.toHaveBeenCalled();
  expect(clipboard.writeBuffer).not.toHaveBeenCalled();
});

// test('cut', async () => {
//   let state = _.cloneDeep(defaultEditorState);
//   state.document.content = [
//     { type: 'paragraph_break', speaker: 'Speaker One' },
//     { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ];
//   state.selection = { headPosition: 'left', startIndex: 0, length: 2 };
//   const newState = await runAsyncActionWithEditorState(cut, state);
//   if (newState) {
//     state = newState;
//   }
//
//   expect(state.document.content).toStrictEqual([
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ]);
//
//   expect(serializeDocument).toHaveBeenCalledTimes(1);
//   expect(serializeDocument.mock.calls[0].length).toBe(1);
//   expect(serializeDocument.mock.calls[0][0]).toMatchObject({
//     content: [
//       { type: 'paragraph_break', speaker: 'Speaker One' },
//       { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     ],
//   });
//   expect(clipboard.writeBuffer).toHaveBeenCalled();
// });
//
// test('cut adds para-break before first word', async () => {
//   let state = _.cloneDeep(defaultEditorState);
//   state.document.content = [
//     { type: 'paragraph_break', speaker: 'Speaker One' },
//     { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ];
//   state.selection = { headPosition: 'left', startIndex: 2, length: 1 };
//   const newState = await runAsyncActionWithEditorState(cut, state);
//   if (newState) {
//     state = newState;
//   }
//
//   expect(state.document.content).toStrictEqual([
//     { type: 'paragraph_break', speaker: 'Speaker One' },
//     { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ]);
//
//   expect(serializeDocument).toHaveBeenCalledTimes(1);
//   expect(serializeDocument.mock.calls[0].length).toBe(1);
//   expect(serializeDocument.mock.calls[0][0]).toMatchObject({
//     content: [
//       { type: 'paragraph_break', speaker: 'Speaker One' },
//       { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     ],
//   });
//   expect(clipboard.writeBuffer).toHaveBeenCalled();
// });
//
// test('cut adds para break if selections end in heading', async () => {
//   let state = _.cloneDeep(defaultEditorState);
//   state.document.content = [
//     { type: 'paragraph_break', speaker: 'Speaker One' },
//     { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ];
//   state.selection = { headPosition: 'left', startIndex: 0, length: 3 };
//   const newState = await runAsyncActionWithEditorState(cut, state);
//   if (newState) {
//     state = newState;
//   }
//
//   expect(state.document.content).toStrictEqual([
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ]);
//
//   expect(serializeDocument).toHaveBeenCalledTimes(1);
//   expect(serializeDocument.mock.calls[0].length).toBe(1);
//   expect(serializeDocument.mock.calls[0][0]).toMatchObject({
//     content: [
//       { type: 'paragraph_break', speaker: 'Speaker One' },
//       { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//       { type: 'heading', level: 1, text: 'Heading One' },
//       { type: 'paragraph_break', speaker: null },
//     ],
//   });
//   expect(clipboard.writeBuffer).toHaveBeenCalled();
// });
//
// test('cut does nothing if no selection', async () => {
//   let state = _.cloneDeep(defaultEditorState);
//   state.document.content = [
//     { type: 'paragraph_break', speaker: 'Speaker One' },
//     { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ];
//   state.selection = null;
//   const newState = await runAsyncActionWithEditorState(cut, state);
//   if (newState) {
//     state = newState;
//   }
//   expect(state.document.content).toStrictEqual([
//     { type: 'paragraph_break', speaker: 'Speaker One' },
//     { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
//     { type: 'heading', level: 1, text: 'Heading One' },
//     { type: 'paragraph_break', speaker: 'Speaker Two' },
//     { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
//   ]);
//   expect(serializeDocument).not.toHaveBeenCalled();
//   expect(clipboard.writeBuffer).not.toHaveBeenCalled();
// });

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
      { type: 'heading', level: 1, text: 'test' },
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
    { type: 'heading', level: 1, text: 'test' },
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

test('paste: first after para break generates new para break after', async () => {
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

test('copySelectionText', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Something Something' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 0, length: 1 },
    { type: 'word', word: 'Two', conf: 1, source: 'source-2', sourceStart: 1, length: 1 },
    { type: 'word', word: 'Three Four', conf: 1, source: 'source-1', sourceStart: 2, length: 1 },
    { type: 'heading', level: 1, text: 'Heading One' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Five', conf: 1, source: 'source-2', sourceStart: 0, length: 1 },
    { type: 'word', word: 'Six', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'word', word: 'Seven Eight', conf: 1, source: 'source-2', sourceStart: 2, length: 1 },
    { type: 'heading', level: 2, text: 'Heading Two' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'heading', level: 3, text: 'Heading Three' },
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

  await runAsyncAction(copySelectionText, (initialState) => (initialState.editor.present = state));

  expect(mockedWriteText).toHaveBeenCalledTimes(1);
  expect(mockedWriteText).toHaveBeenCalledWith(
    'Speaker One:\n' +
      'One Two Three Four\n' +
      '\n' +
      '# Heading One\n' +
      '\n' +
      'Speaker Two:\nFive Six Seven Eight\n' +
      '\n' +
      '## Heading Two\n' +
      '\n' +
      'Speaker Two:\n' +
      '\n' +
      '### Heading Three\n' +
      '\n' +
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

  await runAsyncAction(copySelectionText, (initialState) => (initialState.editor.present = state));

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

  await runAsyncAction(copySelectionText, (initialState) => (initialState.editor.present = state));

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

  await runAsyncAction(copySelectionText, (initialState) => (initialState.editor.present = state));

  expect(mockedWriteText).toHaveBeenCalledTimes(0);
});
