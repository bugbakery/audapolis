import { DocumentItem } from '../../core/document';
import { defaultEditorState } from './types';
import _ from 'lodash';
import {
  currentCursorTime,
  currentItem,
  currentSpeaker,
  macroItems,
  paragraphItems,
  renderItems,
  selectedItems,
  timedDocumentItems,
} from './selectors';
import { produce } from 'immer';

const testContent: DocumentItem[] = [
  { type: 'heading', level: 1, text: 'First big heading' },
  { type: 'paragraph_break', speaker: 'Speaker One' },
  { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
  { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
  { type: 'word', source: 'source-1', sourceStart: 4, length: 1, word: 'Three', conf: 1 },
  { type: 'word', source: 'source-1', sourceStart: 5, length: 1, word: 'Four', conf: 1 },
  { type: 'paragraph_break', speaker: null },
  { type: 'heading', text: 'Heading Two', level: 2 },
  { type: 'paragraph_break', speaker: 'Speaker Two' },
  { type: 'word', source: 'source-2', sourceStart: 2, length: 1, word: 'One', conf: 1 },
  { type: 'word', source: 'source-2', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
  { type: 'word', source: 'source-2', sourceStart: 4, length: 1, word: 'Three', conf: 1 },
  { type: 'word', source: 'source-2', sourceStart: 5, length: 1, word: 'Four', conf: 1 },
  { type: 'artificial_silence', length: 10 },
];

test('convert document to timed items', () => {
  expect(timedDocumentItems(testContent)).toStrictEqual([
    { type: 'heading', level: 1, text: 'First big heading', absoluteStart: 0, absoluteIndex: 0 },
    { type: 'paragraph_break', speaker: 'Speaker One', absoluteStart: 0, absoluteIndex: 1 },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 2,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 3,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 4,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 3,
      absoluteIndex: 5,
    },
    { type: 'paragraph_break', speaker: null, absoluteStart: 4, absoluteIndex: 6 },
    { type: 'heading', text: 'Heading Two', level: 2, absoluteStart: 4, absoluteIndex: 7 },
    { type: 'paragraph_break', speaker: 'Speaker Two', absoluteStart: 4, absoluteIndex: 8 },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 4,
      absoluteIndex: 9,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 5,
      absoluteIndex: 10,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 6,
      absoluteIndex: 11,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 7,
      absoluteIndex: 12,
    },
    { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 13 },
  ]);
});

test('convert document to paragraph items', () => {
  expect(paragraphItems(testContent)).toStrictEqual([
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 2,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 3,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 4,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 3,
      absoluteIndex: 5,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 4,
      absoluteIndex: 9,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 5,
      absoluteIndex: 10,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 6,
      absoluteIndex: 11,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 7,
      absoluteIndex: 12,
    },
    { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 13 },
  ]);
});

test('selected items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.selection = {
    startIndex: 2,
    length: 2,
    headPosition: 'right',
  };
  expect(selectedItems(state)).toStrictEqual([
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 2,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 3,
    },
  ]);
});

test('current user cursor time at zero-length item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 8;
  expect(currentCursorTime(state)).toBe(4);
});
test('current user cursor time at word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 4;
  expect(currentCursorTime(state)).toBe(2);
});

test('current player cursor time ', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 23.42;
  expect(currentCursorTime(state)).toBe(23.42);
});

test('current item with user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 2,
    length: 1,
    word: 'One',
    conf: 1,
    absoluteStart: 0,
    absoluteIndex: 2,
  });
});

test('current item with player cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 2;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 4,
    length: 1,
    word: 'Three',
    conf: 1,
    absoluteStart: 2,
    absoluteIndex: 4,
  });
});

test('current item -> current Time -> current item roundtrips', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    word: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 3,
  });
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentCursorTime(state)).toBe(1);
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    word: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 3,
  });
});

test('current items returns current item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1.5;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    word: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 3,
  });
});

test('current item at t = 0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 2,
    length: 1,
    word: 'One',
    conf: 1,
    absoluteStart: 0,
    absoluteIndex: 2,
  });
});

test('current item skips through zero-length items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 4;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-2',
    sourceStart: 2,
    length: 1,
    word: 'One',
    conf: 1,
    absoluteStart: 4,
    absoluteIndex: 9,
  });
});

test('current item skips through zero-length items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep([
    { type: 'heading', text: 'H1', level: 1 },
    { type: 'paragraph_break', speaker: 'Speaker One' },
  ]);
  state.cursor.current = 'player';
  state.cursor.playerTime = 4;
  expect(currentItem(state)).toStrictEqual({
    type: 'paragraph_break',
    speaker: 'Speaker One',
    absoluteStart: 0,
    absoluteIndex: 1,
  });
});

test('current item for empty document', () => {
  const state = _.cloneDeep(defaultEditorState);
  expect(currentItem(state)).toStrictEqual({
    type: 'paragraph_break',
    speaker: null,
    absoluteStart: 0,
    absoluteIndex: 0,
  });
});

test('current item at t = 0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
    { type: 'heading', level: 1, text: 'First big heading' },
    { type: 'heading', level: 2, text: 'Second heading' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
  ]);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentItem(state)).toStrictEqual({
    type: 'paragraph_break',
    speaker: 'Speaker Two',
    absoluteStart: 1,
    absoluteIndex: 4,
  });
});

test('paragraphs', () => {
  expect(macroItems(testContent)).toStrictEqual([
    { type: 'heading', level: 1, text: 'First big heading', absoluteStart: 0, absoluteIndex: 0 },
    {
      type: 'paragraph',
      speaker: 'Speaker One',
      absoluteStart: 0,
      absoluteIndex: 1,
      content: [
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 2,
          length: 1,
          word: 'One',
          conf: 1,
          absoluteStart: 0,
          absoluteIndex: 2,
        },
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 3,
          length: 1,
          word: 'Two',
          conf: 1,
          absoluteStart: 1,
          absoluteIndex: 3,
        },
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 4,
          length: 1,
          word: 'Three',
          conf: 1,
          absoluteStart: 2,
          absoluteIndex: 4,
        },
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 5,
          length: 1,
          word: 'Four',
          conf: 1,
          absoluteStart: 3,
          absoluteIndex: 5,
        },
      ],
    },
    { type: 'paragraph', speaker: null, absoluteStart: 4, absoluteIndex: 6, content: [] },
    { type: 'heading', text: 'Heading Two', level: 2, absoluteStart: 4, absoluteIndex: 7 },
    {
      type: 'paragraph',
      speaker: 'Speaker Two',
      absoluteStart: 4,
      absoluteIndex: 8,
      content: [
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 2,
          length: 1,
          word: 'One',
          conf: 1,
          absoluteStart: 4,
          absoluteIndex: 9,
        },
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 3,
          length: 1,
          word: 'Two',
          conf: 1,
          absoluteStart: 5,
          absoluteIndex: 10,
        },
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 4,
          length: 1,
          word: 'Three',
          conf: 1,
          absoluteStart: 6,
          absoluteIndex: 11,
        },
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 5,
          length: 1,
          word: 'Four',
          conf: 1,
          absoluteStart: 7,
          absoluteIndex: 12,
        },
        { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 13 },
      ],
    },
  ]);
});

test('paragraphs fails if no para break before first word', () => {
  expect(() =>
    macroItems([
      { type: 'word', source: 'source-1', sourceStart: 4, length: 1, word: 'Three', conf: 1 },
    ])
  ).toThrowError('paragraph');
});

test('paragraph from heading without prior para break', () => {
  expect(
    macroItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'heading', level: 1, text: 'First big heading' },
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', source: 'source-2', sourceStart: 2, length: 1, word: 'One', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'paragraph',
      speaker: 'Speaker One',
      absoluteStart: 0,
      absoluteIndex: 0,
      content: [
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 2,
          length: 1,
          word: 'One',
          conf: 1,
          absoluteStart: 0,
          absoluteIndex: 1,
        },
      ],
    },
    { type: 'heading', level: 1, text: 'First big heading', absoluteStart: 1, absoluteIndex: 2 },
    {
      type: 'paragraph',
      speaker: 'Speaker Two',
      absoluteStart: 1,
      absoluteIndex: 3,
      content: [
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 2,
          length: 1,
          word: 'One',
          conf: 1,
          absoluteStart: 1,
          absoluteIndex: 4,
        },
      ],
    },
  ]);
});

test('renderItems', () => {
  expect(renderItems(testContent)).toStrictEqual([
    {
      type: 'media',
      absoluteStart: 0,
      length: 4,
      source: 'source-1',
      sourceStart: 2,
      speaker: 'Speaker One',
    },
    {
      type: 'media',
      absoluteStart: 4,
      length: 4,
      source: 'source-2',
      sourceStart: 2,
      speaker: 'Speaker Two',
    },
    { type: 'silence', length: 10, absoluteStart: 8 },
  ]);
});

test('render items: same source, not-matching time', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'word', source: 'source-1', sourceStart: 3.1, length: 1, word: 'Two', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'media',
      absoluteStart: 0,
      length: 1,
      source: 'source-1',
      sourceStart: 2,
      speaker: 'Speaker One',
    },
    {
      type: 'media',
      absoluteStart: 1,
      length: 1,
      source: 'source-1',
      sourceStart: 3.1,
      speaker: 'Speaker One',
    },
  ]);
});

test('render items: same source, not-matching time', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'word', source: 'source-1', sourceStart: 2.9, length: 1, word: 'Two', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'media',
      absoluteStart: 0,
      length: 1,
      source: 'source-1',
      sourceStart: 2,
      speaker: 'Speaker One',
    },
    {
      type: 'media',
      absoluteStart: 1,
      length: 1,
      source: 'source-1',
      sourceStart: 2.9,
      speaker: 'Speaker One',
    },
  ]);
});

test('render items: same source, matching time', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'media',
      absoluteStart: 0,
      length: 2,
      source: 'source-1',
      sourceStart: 2,
      speaker: 'Speaker One',
    },
  ]);
});

test('render items: missing paragraph break', () => {
  expect(() =>
    renderItems([
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
    ])
  ).toThrow(/ParagraphItem encountered before first paragraph break/);
});

test('render items: same source, matching time, matching speaker-name', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'media',
      absoluteStart: 0,
      length: 2,
      source: 'source-1',
      sourceStart: 2,
      speaker: 'Speaker One',
    },
  ]);
});

test('render items: same source, matching time, mismatching speaker-name', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'media',
      absoluteStart: 0,
      length: 1,
      source: 'source-1',
      sourceStart: 2,
      speaker: 'Speaker One',
    },
    {
      type: 'media',
      absoluteStart: 1,
      length: 1,
      source: 'source-1',
      sourceStart: 3,
      speaker: 'Speaker Two',
    },
  ]);
});

test('render items: two silences', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'artificial_silence', length: 1 },
      { type: 'artificial_silence', length: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'silence',
      absoluteStart: 0,
      length: 2,
    },
  ]);
});

test('render items: word after silence', () => {
  expect(
    renderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'artificial_silence', length: 1 },
      { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
    ])
  ).toStrictEqual([
    {
      type: 'silence',
      absoluteStart: 0,
      length: 1,
    },
    {
      type: 'media',
      absoluteStart: 1,
      length: 1,
      source: 'source-1',
      sourceStart: 3,
      speaker: 'Speaker One',
    },
  ]);
});

test('currentSpeaker: player cursor', () => {
  let state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  expect(currentSpeaker(state)).toBe('Speaker One');
  state.cursor.playerTime = 1.1;
  expect(currentSpeaker(state)).toBe('Speaker One');
  state = produce(state, (state) => {
    state.cursor.playerTime = 4;
  });
  expect(currentSpeaker(state)).toBe('Speaker Two');
});

test('currentSpeaker: user cursor', () => {
  let state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  expect(currentSpeaker(state)).toBe(null);
  state = produce(state, (state) => {
    state.cursor.userIndex = 2;
  });
  expect(currentSpeaker(state)).toBe('Speaker One');
  state = produce(state, (state) => {
    state.cursor.userIndex = 8;
  });
  expect(currentSpeaker(state)).toBe(null);
  state = produce(state, (state) => {
    state.cursor.userIndex = 9;
  });
  expect(currentSpeaker(state)).toBe('Speaker Two');
});

test('currentSpeaker with 0-len para: player cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Three' },
    { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
  ]);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentSpeaker(state)).toBe('Speaker Three');
});

test('currentSpeaker with 0-len para: user cursor', () => {
  let state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Three' },
    { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
  ]);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentSpeaker(state)).toBe('Speaker One');
  state = produce(state, (state) => {
    state.cursor.userIndex = 3;
  });
  expect(currentSpeaker(state)).toBe('Speaker Two');
  state = produce(state, (state) => {
    state.cursor.userIndex = 4;
  });
  expect(currentSpeaker(state)).toBe('Speaker Three');
});

test('currentSpeaker before first para break', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Three' },
    { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
  ]);
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  expect(currentSpeaker(state)).toBe(null);
});

test('current item at t=4', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 4;
  expect(currentItem(state)).toMatchObject({
    type: 'word',
    source: 'source-2',
    sourceStart: 2,
    length: 1,
    word: 'One',
    conf: 1,
  });
});
