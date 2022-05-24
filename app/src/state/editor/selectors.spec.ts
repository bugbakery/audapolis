import { DocumentItem, Source, UntimedMacroItem } from '../../core/document';
import { defaultEditorState, EditorState } from './types';
import _ from 'lodash';
import {
  currentCursorTime,
  currentItem,
  currentSpeaker,
  memoizedMacroItems,
  memoizedParagraphItems,
  memoizedDocumentRenderItems,
  selectedItems,
  memoizedSpeakerIndices,
  memoizedTimedDocumentItems,
  renderItems,
  firstPossibleCursorPosition,
  currentIndexLeft,
  memoize,
  selectionSpansMultipleParagraphs,
  macroItemsToText,
  selectionDocument,
} from './selectors';
import { produce } from 'immer';

const testContent: DocumentItem[] = [
  { type: 'paragraph_break', speaker: 'Speaker One' },
  { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
  { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
  { type: 'word', source: 'source-1', sourceStart: 4, length: 1, word: 'Three', conf: 1 },
  { type: 'word', source: 'source-1', sourceStart: 5, length: 1, word: 'Four', conf: 1 },
  { type: 'paragraph_break', speaker: null },
  { type: 'paragraph_break', speaker: 'Speaker Two' },
  { type: 'word', source: 'source-2', sourceStart: 2, length: 1, word: 'One', conf: 1 },
  { type: 'word', source: 'source-2', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
  { type: 'word', source: 'source-2', sourceStart: 4, length: 1, word: 'Three', conf: 1 },
  { type: 'word', source: 'source-2', sourceStart: 5, length: 1, word: 'Four', conf: 1 },
  { type: 'artificial_silence', length: 10 },
];
const testSources: Record<string, Source> = {
  'source-1': {
    fileContents: new ArrayBuffer(0),
    objectUrl: 'blob://source-1',
  },
  'source-2': {
    fileContents: new ArrayBuffer(0),
    objectUrl: 'blob://source-2',
  },
};

test('convert document to timed items', () => {
  expect(memoizedTimedDocumentItems(testContent)).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One', absoluteStart: 0, absoluteIndex: 0 },
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
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 3,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 3,
      absoluteIndex: 4,
    },
    { type: 'paragraph_break', speaker: null, absoluteStart: 4, absoluteIndex: 5 },
    { type: 'paragraph_break', speaker: 'Speaker Two', absoluteStart: 4, absoluteIndex: 6 },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 4,
      absoluteIndex: 7,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 5,
      absoluteIndex: 8,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 6,
      absoluteIndex: 9,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 7,
      absoluteIndex: 10,
    },
    { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 11 },
  ]);
});

test('convert document to paragraph items', () => {
  expect(memoizedParagraphItems(testContent)).toStrictEqual([
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
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 3,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 3,
      absoluteIndex: 4,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 2,
      length: 1,
      word: 'One',
      conf: 1,
      absoluteStart: 4,
      absoluteIndex: 7,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 5,
      absoluteIndex: 8,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 6,
      absoluteIndex: 9,
    },
    {
      type: 'word',
      source: 'source-2',
      sourceStart: 5,
      length: 1,
      word: 'Four',
      conf: 1,
      absoluteStart: 7,
      absoluteIndex: 10,
    },
    { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 11 },
  ]);
});

test('selected items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.selection = {
    startIndex: 1,
    length: 2,
    headPosition: 'right',
  };
  expect(selectedItems(state)).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One', absoluteStart: 0, absoluteIndex: 0 },
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
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
  ]);
});

test('selected items: doesnt add para break if already selected', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.selection = {
    startIndex: 0,
    length: 3,
    headPosition: 'right',
  };
  expect(selectedItems(state)).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One', absoluteStart: 0, absoluteIndex: 0 },
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
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
  ]);
});

test('selected items: empty selection', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);

  expect(selectedItems(state)).toStrictEqual([]);
});

test('selected items: empty content', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.selection = { headPosition: 'right', startIndex: 1, length: 1 };
  expect(selectedItems(state)).toStrictEqual([]);
});

test('selected render items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.selection = {
    startIndex: 2,
    length: 2,
    headPosition: 'right',
  };
  const selItems = selectedItems(state);
  expect(selItems).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One', absoluteStart: 1, absoluteIndex: 1 },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      word: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    {
      type: 'word',
      source: 'source-1',
      sourceStart: 4,
      length: 1,
      word: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 3,
    },
  ]);
  expect(renderItems(selItems)).toStrictEqual([
    {
      absoluteStart: 1,
      length: 2,
      source: 'source-1',
      sourceStart: 3,
      speaker: 'Speaker One',
      type: 'media',
    },
  ]);
});

test('selectionDocument: strips unused sources', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.document.sources = _.cloneDeep(testSources);
  state.selection = {
    startIndex: 3,
    length: 2,
    headPosition: 'right',
  };
  const selDocument = selectionDocument(state);
  expect(selDocument.sources).toStrictEqual({
    'source-1': {
      fileContents: new ArrayBuffer(0),
      objectUrl: 'blob://source-1',
    },
  });
});

test('selectionDocument: packs all used sources', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.document.sources = _.cloneDeep(testSources);
  state.selection = {
    startIndex: 3,
    length: 10,
    headPosition: 'right',
  };
  const selDocument = selectionDocument(state);
  expect(selDocument.sources).toStrictEqual({
    'source-1': {
      fileContents: new ArrayBuffer(0),
      objectUrl: 'blob://source-1',
    },
    'source-2': {
      fileContents: new ArrayBuffer(0),
      objectUrl: 'blob://source-2',
    },
  });
});

test('selectionDocument adds para-break before first word', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
  ];
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };

  expect(selectionDocument(state).content).toStrictEqual([
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
  ]);
});

test('selection spans multiple paragraphs: true', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.selection = {
    startIndex: 3,
    length: 7,
    headPosition: 'right',
  };
  expect(selectionSpansMultipleParagraphs(state)).toStrictEqual(true);
});

test('selection spans multiple paragraphs: false', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.selection = {
    startIndex: 3,
    length: 2,
    headPosition: 'left',
  };
  expect(selectionSpansMultipleParagraphs(state)).toStrictEqual(false);
});

test('current user cursor time at zero-length item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 6;
  expect(currentCursorTime(state)).toBe(4);
});
test('current user cursor time at word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentCursorTime(state)).toBe(1);
});

test('current user cursor time after last item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 14;
  expect(currentCursorTime(state)).toBe(18);
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
  state.cursor.userIndex = 1;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 2,
    length: 1,
    word: 'One',
    conf: 1,
    absoluteStart: 0,
    absoluteIndex: 1,
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
    absoluteIndex: 3,
  });
});

test('current item -> current Time -> current item roundtrips', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentItem(state)).toStrictEqual({
    type: 'word',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    word: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 2,
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
    absoluteIndex: 2,
  });
});

test('current item at t=1.5', () => {
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
    absoluteIndex: 2,
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
    absoluteIndex: 1,
  });
});

test('current item with player time returns item with length', () => {
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
    absoluteIndex: 7,
  });
});

test('current item skips through zero-length items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep([{ type: 'paragraph_break', speaker: 'Speaker One' }]);
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  expect(currentItem(state)).toStrictEqual({
    type: 'paragraph_break',
    speaker: 'Speaker One',
    absoluteStart: 0,
    absoluteIndex: 0,
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
    { type: 'paragraph_break', speaker: 'Speaker Two' },
  ]);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentItem(state)).toStrictEqual({
    type: 'paragraph_break',
    speaker: 'Speaker Two',
    absoluteStart: 1,
    absoluteIndex: 2,
  });
});

test('paragraphs', () => {
  expect(memoizedMacroItems(testContent)).toStrictEqual([
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
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 3,
          length: 1,
          word: 'Two',
          conf: 1,
          absoluteStart: 1,
          absoluteIndex: 2,
        },
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 4,
          length: 1,
          word: 'Three',
          conf: 1,
          absoluteStart: 2,
          absoluteIndex: 3,
        },
        {
          type: 'word',
          source: 'source-1',
          sourceStart: 5,
          length: 1,
          word: 'Four',
          conf: 1,
          absoluteStart: 3,
          absoluteIndex: 4,
        },
      ],
    },
    { type: 'paragraph', speaker: null, absoluteStart: 4, absoluteIndex: 5, content: [] },
    {
      type: 'paragraph',
      speaker: 'Speaker Two',
      absoluteStart: 4,
      absoluteIndex: 6,
      content: [
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 2,
          length: 1,
          word: 'One',
          conf: 1,
          absoluteStart: 4,
          absoluteIndex: 7,
        },
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 3,
          length: 1,
          word: 'Two',
          conf: 1,
          absoluteStart: 5,
          absoluteIndex: 8,
        },
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 4,
          length: 1,
          word: 'Three',
          conf: 1,
          absoluteStart: 6,
          absoluteIndex: 9,
        },
        {
          type: 'word',
          source: 'source-2',
          sourceStart: 5,
          length: 1,
          word: 'Four',
          conf: 1,
          absoluteStart: 7,
          absoluteIndex: 10,
        },
        { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 11 },
      ],
    },
  ]);
});

test('paragraphs fails if no para break before first word', () => {
  expect(() =>
    memoizedMacroItems([
      { type: 'word', source: 'source-1', sourceStart: 4, length: 1, word: 'Three', conf: 1 },
    ])
  ).toThrowError('paragraph');
});

test('renderItems', () => {
  expect(memoizedDocumentRenderItems(testContent)).toStrictEqual([
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

test('render items: source silence', () => {
  expect(
    memoizedDocumentRenderItems([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'silence', source: 'source-1', sourceStart: 3, length: 1 },
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

test('render items: same source, not-matching time', () => {
  expect(
    memoizedDocumentRenderItems([
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
    memoizedDocumentRenderItems([
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
    memoizedDocumentRenderItems([
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
    memoizedDocumentRenderItems([
      { type: 'word', source: 'source-1', sourceStart: 2, length: 1, word: 'One', conf: 1 },
      { type: 'word', source: 'source-1', sourceStart: 3, length: 1, word: 'Two', conf: 1 },
    ])
  ).toThrow(/who is the speaker/i);
});

test('render items: same source, matching time, matching speaker-name', () => {
  expect(
    memoizedDocumentRenderItems([
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
    memoizedDocumentRenderItems([
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
    memoizedDocumentRenderItems([
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
    memoizedDocumentRenderItems([
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
    state.cursor.userIndex = 1;
  });
  expect(currentSpeaker(state)).toBe('Speaker One');
  state = produce(state, (state) => {
    state.cursor.userIndex = 6;
  });
  expect(currentSpeaker(state)).toBe(null);
  state = produce(state, (state) => {
    state.cursor.userIndex = 8;
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

test('speakerIndices', () => {
  const content = _.cloneDeep(testContent);
  const contentMacros = memoizedMacroItems(content);
  expect(memoizedSpeakerIndices(contentMacros)).toStrictEqual({
    'Speaker One': 0,
    'Speaker Two': 1,
  });
});

test('speakerIndices: empty doc', () => {
  const contentMacros = memoizedMacroItems([]);
  expect(memoizedSpeakerIndices(contentMacros)).toStrictEqual({});
});

test('speakerIndices: doc with only para breaks', () => {
  const contentMacros = memoizedMacroItems([
    { type: 'paragraph_break', speaker: null },
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'paragraph_break', speaker: null },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker Two' },
    { type: 'paragraph_break', speaker: 'Speaker One' },
  ]);
  expect(memoizedSpeakerIndices(contentMacros)).toStrictEqual({
    'Speaker One': 0,
    'Speaker Two': 1,
  });
});

test('firstPossibleCursorPosition', () => {
  expect(
    firstPossibleCursorPosition([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
    ])
  ).toBe(1);

  expect(
    firstPossibleCursorPosition([
      { type: 'paragraph_break', speaker: 'Speaker One' },
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
    ])
  ).toBe(1);

  expect(
    firstPossibleCursorPosition([
      { type: 'paragraph_break', speaker: 'Speaker Two' },
      { type: 'word', length: 1, sourceStart: 1, source: 'source-1', word: 'One', conf: 1 },
    ])
  ).toBe(1);
});

test('current index left with user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentIndexLeft(state)).toStrictEqual(1);
});

test('current index left with user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  expect(currentIndexLeft(state)).toStrictEqual(-1);
});

test('current index left with player cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentIndexLeft(state)).toStrictEqual(1);
});

test.each([1.1, 1.25, 1.5, 1.75, 2])('current index left with player cursor at t=%ds', (time) => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContent);
  state.cursor.current = 'player';
  state.cursor.playerTime = time;
  expect(currentIndexLeft(state)).toStrictEqual(2);
});

test('memoize returns old value if called within immerjs', () => {
  const memoize1 = memoize((state: EditorState) => state.playing);
  let state = _.cloneDeep(defaultEditorState);
  state.playing = false;
  expect(memoize1(state)).toBe(false);
  state = produce(state, (state) => {
    state.playing = true;
    // If you call a memoized selector from within produce, immer isn't aware of the change yet, so
    // the memoized function will return the old value 😳
    expect(memoize1(state)).toBe(false);
  });
  // But after immer noticed, everything is alright again 😊
  expect(memoize1(state)).toBe(true);
});

function getCountingFunction(
  cache_size = 4
): [{ current: number }, (...args: any) => any[], (...args: any) => any[]] {
  const counter = { current: 0 };
  const countingFn = (...args: any) => {
    counter.current += 1;
    return args;
  };
  const memoizedCountingFunction = memoize(countingFn, cache_size);
  return [counter, memoizedCountingFunction, countingFn];
}

test('memoize works for one argument ☝️', () => {
  const [counter, memoizedCountingFunction, _] = getCountingFunction();
  expect(counter.current).toBe(0);
  expect(memoizedCountingFunction(1)).toStrictEqual([1]);
  expect(counter.current).toBe(1);
  expect(memoizedCountingFunction(1)).toStrictEqual([1]);
  expect(counter.current).toBe(1);
  expect(memoizedCountingFunction(2)).toStrictEqual([2]);
  expect(counter.current).toBe(2);
  expect(memoizedCountingFunction(2)).toStrictEqual([2]);
  expect(counter.current).toBe(2);
});

test('memoize works for two arguments ✌️', () => {
  const [counter, memoizedCountingFunction, _] = getCountingFunction(2);
  expect(counter.current).toBe(0);
  expect(memoizedCountingFunction(1, 0)).toStrictEqual([1, 0]);
  expect(counter.current).toBe(1);
  expect(memoizedCountingFunction(1, 0)).toStrictEqual([1, 0]);
  expect(counter.current).toBe(1);
  expect(memoizedCountingFunction(1, 1)).toStrictEqual([1, 1]);
  expect(counter.current).toBe(2);
  expect(memoizedCountingFunction(2, 1)).toStrictEqual([2, 1]);
  expect(counter.current).toBe(3);
  // cache size = 2, so the previous one is still in cache...
  expect(memoizedCountingFunction(1, 1)).toStrictEqual([1, 1]);
  expect(counter.current).toBe(3);
  // ... but the pre-previous isn't
  expect(memoizedCountingFunction(1, 0)).toStrictEqual([1, 0]);
  expect(counter.current).toBe(4);
});

test('macroItemsToText empty', () => {
  expect(macroItemsToText([], false)).toBe('');
});

const testMacroItems: UntimedMacroItem[] = [
  { type: 'paragraph', speaker: 'Something Something', content: [] },
  {
    type: 'paragraph',
    speaker: 'Speaker One',
    content: [
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 0, length: 1 },
      { type: 'word', word: 'Two', conf: 1, source: 'source-2', sourceStart: 1, length: 1 },
      {
        type: 'word',
        word: 'Three Four',
        conf: 1,
        source: 'source-1',
        sourceStart: 2,
        length: 1,
      },
    ],
  },
  {
    type: 'paragraph',
    speaker: 'Speaker Two',
    content: [
      { type: 'word', word: 'Five', conf: 1, source: 'source-2', sourceStart: 0, length: 1 },
      { type: 'word', word: 'Six', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
      {
        type: 'word',
        word: 'Seven Eight',
        conf: 1,
        source: 'source-2',
        sourceStart: 2,
        length: 1,
      },
    ],
  },
  { type: 'paragraph', speaker: 'Speaker Two', content: [] },
  {
    type: 'paragraph',
    speaker: 'Speaker Three',
    content: [
      {
        type: 'word',
        word: 'Something',
        conf: 1,
        source: 'source-4',
        sourceStart: 0,
        length: 1,
      },
      {
        type: 'word',
        word: 'Something',
        conf: 1,
        source: 'source-4',
        sourceStart: 1,
        length: 1,
      },
    ],
  },
];
test('macroItemsToText speaker names', () => {
  expect(macroItemsToText(testMacroItems, true)).toBe(
    'Something Something:\n\nSpeaker One:\n' +
      'One Two Three Four\n\n' +
      'Speaker Two:\nFive Six Seven Eight\n\n' +
      'Speaker Two:\n\n' +
      'Speaker Three:\nSomething Something'
  );
});

test('macroItemsToText no speaker names', () => {
  expect(macroItemsToText(testMacroItems, false)).toBe(
    'One Two Three Four\n' + '\n' + 'Five Six Seven Eight\n' + '\n' + 'Something Something'
  );
});

test('memoize recalculated if more arguments are passed', () => {
  const [counter, memoizedCountingFunction, _] = getCountingFunction();
  expect(counter.current).toBe(0);
  expect(memoizedCountingFunction(1)).toStrictEqual([1]);
  expect(counter.current).toBe(1);
  expect(memoizedCountingFunction(1)).toStrictEqual([1]);
  expect(counter.current).toBe(1);
  expect(memoizedCountingFunction(1, 2)).toStrictEqual([1, 2]);
  expect(counter.current).toBe(2);
  expect(memoizedCountingFunction(1, 2)).toStrictEqual([1, 2]);
  expect(counter.current).toBe(2);
});
