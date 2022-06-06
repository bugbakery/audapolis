import { Source, V3DocumentItem, V3UntimedMacroItem } from '../../core/document';
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
import { addUuids, V3DocumentItemWithoutUuid } from '../../util/test_helper';

const testParagraphSpeaker1: V3DocumentItemWithoutUuid[] = [
  { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
  { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-1', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'paragraph_break' },
];

const testParagraphEmpty: V3DocumentItemWithoutUuid[] = [
  { type: 'paragraph_start', speaker: 'Speaker Empty', language: 'test' },
  { type: 'paragraph_break' },
];

const testParagraphSpeaker2: V3DocumentItemWithoutUuid[] = [
  { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test2' },
  { type: 'text', source: 'source-2', sourceStart: 2, length: 1, text: 'One', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
  { type: 'text', source: 'source-2', sourceStart: 5, length: 1, text: 'Four', conf: 1 },
  { type: 'artificial_silence', length: 10 },
  { type: 'paragraph_break' },
];

const testContentLong: V3DocumentItem[] = addUuids([
  ...testParagraphSpeaker1,
  ...testParagraphEmpty,
  ...testParagraphSpeaker2,
]);

const testContentShort: V3DocumentItem[] = addUuids(testParagraphSpeaker2);

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
  expect(memoizedTimedDocumentItems(testContentShort)).toStrictEqualExceptUuids([
    {
      type: 'paragraph_start',
      speaker: 'Speaker Two',
      language: 'test2',
      absoluteStart: 0,
      absoluteIndex: 0,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 2,
      length: 1,
      text: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 1,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 3,
      length: 1,
      text: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 4,
      length: 1,
      text: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 3,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 5,
      length: 1,
      text: 'Four',
      conf: 1,
      absoluteStart: 3,
      absoluteIndex: 4,
    },
    { type: 'artificial_silence', length: 10, absoluteStart: 4, absoluteIndex: 5 },
    { type: 'paragraph_break', absoluteStart: 14, absoluteIndex: 6 },
  ]);
});

test('convert document to paragraph items', () => {
  expect(memoizedParagraphItems(testContentShort)).toStrictEqualExceptUuids([
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 2,
      length: 1,
      text: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 1,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 3,
      length: 1,
      text: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 4,
      length: 1,
      text: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 3,
    },
    {
      type: 'text',
      source: 'source-2',
      sourceStart: 5,
      length: 1,
      text: 'Four',
      conf: 1,
      absoluteStart: 3,
      absoluteIndex: 4,
    },
    { type: 'artificial_silence', length: 10, absoluteStart: 4, absoluteIndex: 5 },
  ]);
});

test('selected items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.selection = {
    startIndex: 1,
    length: 2,
    headPosition: 'right',
  };
  expect(selectedItems(state)).toStrictEqualExceptUuids([
    {
      type: 'paragraph_start',
      speaker: 'Speaker One',
      language: 'test',
      absoluteStart: 0,
      absoluteIndex: 0,
    },
    {
      type: 'text',
      source: 'source-1',
      sourceStart: 2,
      length: 1,
      text: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 1,
    },
    {
      type: 'text',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      text: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    { type: 'paragraph_break', absoluteStart: 1, absoluteIndex: 3 },
  ]);
});

test('selected items: doesnt add para start if already selected', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.selection = {
    startIndex: 0,
    length: 3,
    headPosition: 'right',
  };
  expect(selectedItems(state)).toStrictEqualExceptUuids([
    {
      type: 'paragraph_start',
      speaker: 'Speaker One',
      language: 'test',
      absoluteStart: 0,
      absoluteIndex: 0,
    },
    {
      type: 'text',
      source: 'source-1',
      sourceStart: 2,
      length: 1,
      text: 'One',
      conf: 1,
      absoluteStart: 0,
      absoluteIndex: 1,
    },
    {
      type: 'text',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      text: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    { type: 'paragraph_break', absoluteStart: 1, absoluteIndex: 3 },
  ]);
});

test('selected items: empty selection', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);

  expect(selectedItems(state)).toStrictEqual([]);
});

test('selected items: empty content', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.selection = { headPosition: 'right', startIndex: 2, length: 1 };
  expect(selectedItems(state)).toStrictEqual([]);
});

test('selected render items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.selection = {
    startIndex: 2,
    length: 2,
    headPosition: 'right',
  };
  const selItems = selectedItems(state);
  expect(selItems).toStrictEqualExceptUuids([
    {
      absoluteIndex: 1,
      absoluteStart: 1,
      language: 'test',
      speaker: 'Speaker One',
      type: 'paragraph_start',
    },
    {
      type: 'text',
      source: 'source-1',
      sourceStart: 3,
      length: 1,
      text: 'Two',
      conf: 1,
      absoluteStart: 1,
      absoluteIndex: 2,
    },
    {
      type: 'text',
      source: 'source-1',
      sourceStart: 4,
      length: 1,
      text: 'Three',
      conf: 1,
      absoluteStart: 2,
      absoluteIndex: 3,
    },
    { type: 'paragraph_break', absoluteStart: 2, absoluteIndex: 4 },
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
  state.document.content = _.cloneDeep(testContentLong);
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
  state.document.content = _.cloneDeep(testContentLong);
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

test('selectionDocument adds paragraph start before first word; paragraph break at end', async () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = addUuids([
    { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
    { type: 'text', text: 'One', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'text', text: 'Two', length: 1, source: 'source-1', sourceStart: 1, conf: 1 },
    { type: 'paragraph_break' },
    { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
    { type: 'text', text: 'Two', length: 1, source: 'source-1', sourceStart: 2, conf: 1 },
    { type: 'paragraph_break' },
  ]);
  state.selection = { headPosition: 'left', startIndex: 2, length: 1 };

  const selDocument = selectionDocument(state);
  expect(selDocument.content).toStrictEqualExceptUuids([
    { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
    {
      type: 'text',
      text: 'Two',
      length: 1,
      source: 'source-1',
      sourceStart: 1,
      conf: 1,
    },
    { type: 'paragraph_break' },
  ]);
  expect(selDocument.content).toBeValidDocumentContent();
});

test('selection spans multiple paragraphs: true', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.selection = {
    startIndex: 3,
    length: 7,
    headPosition: 'right',
  };
  expect(selectionSpansMultipleParagraphs(state)).toStrictEqual(true);
});

test('selection spans multiple paragraphs: false', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.selection = {
    startIndex: 3,
    length: 2,
    headPosition: 'left',
  };
  expect(selectionSpansMultipleParagraphs(state)).toStrictEqual(false);
});

test('current user cursor time at zero-length item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 6;
  expect(currentCursorTime(state)).toBe(4);
});
test('current user cursor time at word', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentCursorTime(state)).toBe(1);
});

test('current user cursor time after last item', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 14;
  expect(currentCursorTime(state)).toBe(18);
});

test('current player cursor time ', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 23.42;
  expect(currentCursorTime(state)).toBe(23.42);
});

test('current item with user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 1;
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-1',
    sourceStart: 2,
    length: 1,
    text: 'One',
    conf: 1,
    absoluteStart: 0,
    absoluteIndex: 1,
    uuid: '1',
  });
});

test('current item with player cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 2;
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-1',
    sourceStart: 4,
    length: 1,
    text: 'Three',
    conf: 1,
    absoluteStart: 2,
    absoluteIndex: 3,
    uuid: '3',
  });
});

test('current item -> current Time -> current item roundtrips', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    text: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 2,
    uuid: '2',
  });
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentCursorTime(state)).toBe(1);
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    text: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 2,
    uuid: '2',
  });
});

test('current item at t=1.5', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1.5;
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-1',
    sourceStart: 3,
    length: 1,
    text: 'Two',
    conf: 1,
    absoluteStart: 1,
    absoluteIndex: 2,
    uuid: '2',
  });
});

test('current item at t = 0', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-1',
    sourceStart: 2,
    length: 1,
    text: 'One',
    conf: 1,
    absoluteStart: 0,
    absoluteIndex: 1,
    uuid: '1',
  });
});

test('current item with player time returns item with length', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 4;
  expect(currentItem(state)).toStrictEqual({
    type: 'text',
    source: 'source-2',
    sourceStart: 2,
    length: 1,
    text: 'One',
    conf: 1,
    absoluteStart: 4,
    absoluteIndex: 9,
    uuid: '9',
  });
});

test('current item skips through zero-length items', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(
    addUuids([
      { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
      { type: 'paragraph_break' },
    ])
  );
  state.cursor.current = 'player';
  state.cursor.playerTime = 0;
  expect(currentItem(state)).toMatchObject({
    type: 'paragraph_break',
  });
});

test('current item for empty document', () => {
  const state = _.cloneDeep(defaultEditorState);
  expect(currentItem(state)).toMatchObject({
    type: 'paragraph_start',
    absoluteStart: 0,
    absoluteIndex: 0,
  });
});

test('paragraphs', () => {
  expect(memoizedMacroItems(testContentLong)).toMatchObject([
    {
      type: 'paragraph',
      speaker: 'Speaker One',
      absoluteStart: 0,
      absoluteIndex: 0,
      breakAbsoluteIndex: 5,
      breakUuid: '5',
      uuid: '0',
      content: [
        {
          type: 'text',
          source: 'source-1',
          sourceStart: 2,
          length: 1,
          text: 'One',
          conf: 1,
          absoluteStart: 0,
          absoluteIndex: 1,
        },
        {
          type: 'text',
          source: 'source-1',
          sourceStart: 3,
          length: 1,
          text: 'Two',
          conf: 1,
          absoluteStart: 1,
          absoluteIndex: 2,
        },
        {
          type: 'text',
          source: 'source-1',
          sourceStart: 4,
          length: 1,
          text: 'Three',
          conf: 1,
          absoluteStart: 2,
          absoluteIndex: 3,
        },
        {
          type: 'text',
          source: 'source-1',
          sourceStart: 5,
          length: 1,
          text: 'Four',
          conf: 1,
          absoluteStart: 3,
          absoluteIndex: 4,
        },
      ],
    },
    {
      type: 'paragraph',
      speaker: 'Speaker Empty',
      absoluteStart: 4,
      absoluteIndex: 6,
      breakAbsoluteIndex: 7,
      breakUuid: '7',
      content: [],
      uuid: '6',
    },
    {
      type: 'paragraph',
      speaker: 'Speaker Two',
      absoluteStart: 4,
      absoluteIndex: 8,
      breakAbsoluteIndex: 14,
      breakUuid: '14',
      uuid: '8',
      content: [
        {
          type: 'text',
          source: 'source-2',
          sourceStart: 2,
          length: 1,
          text: 'One',
          conf: 1,
          absoluteStart: 4,
          absoluteIndex: 9,
        },
        {
          type: 'text',
          source: 'source-2',
          sourceStart: 3,
          length: 1,
          text: 'Two',
          conf: 1,
          absoluteStart: 5,
          absoluteIndex: 10,
        },
        {
          type: 'text',
          source: 'source-2',
          sourceStart: 4,
          length: 1,
          text: 'Three',
          conf: 1,
          absoluteStart: 6,
          absoluteIndex: 11,
        },
        {
          type: 'text',
          source: 'source-2',
          sourceStart: 5,
          length: 1,
          text: 'Four',
          conf: 1,
          absoluteStart: 7,
          absoluteIndex: 12,
        },
        { type: 'artificial_silence', length: 10, absoluteStart: 8, absoluteIndex: 13 },
      ],
    },
  ]);
});

test('paragraphs fails if no paragraph start before first word', () => {
  expect(() =>
    memoizedMacroItems(
      addUuids([
        { type: 'text', source: 'source-1', sourceStart: 4, length: 1, text: 'Three', conf: 1 },
      ])
    )
  ).toThrowError('paragraph_start');
});

test('renderItems', () => {
  expect(memoizedDocumentRenderItems(testContentLong)).toStrictEqual([
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: null },
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'non_text', source: 'source-1', sourceStart: 3, length: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: null },
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'text', source: 'source-1', sourceStart: 3.1, length: 1, text: 'Two', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'text', source: 'source-1', sourceStart: 2.9, length: 1, text: 'Two', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
      ])
    )
  ).toThrow(/who is the speaker/i);
});

test('render items: same source, matching time, matching speaker-name', () => {
  expect(
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'paragraph_break' },
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'text', source: 'source-1', sourceStart: 2, length: 1, text: 'One', conf: 1 },
        { type: 'paragraph_break' },
        { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
        { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
    memoizedDocumentRenderItems(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'artificial_silence', length: 1 },
        { type: 'text', source: 'source-1', sourceStart: 3, length: 1, text: 'Two', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
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
  state.document.content = _.cloneDeep(testContentLong);
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
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  expect(currentSpeaker(state)).toBe(null);
  state = produce(state, (state) => {
    state.cursor.userIndex = 1;
  });
  expect(currentSpeaker(state)).toBe('Speaker One');
  state = produce(state, (state) => {
    state.cursor.userIndex = 7;
  });
  expect(currentSpeaker(state)).toBe('Speaker Empty');
  state = produce(state, (state) => {
    state.cursor.userIndex = 10;
  });
  expect(currentSpeaker(state)).toBe('Speaker Two');
});

test('currentSpeaker with 0-len para: player cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(
    addUuids([
      { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
      { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Three', language: 'test' },
      { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
      { type: 'paragraph_break' },
    ])
  );
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentSpeaker(state)).toBe('Speaker Three');
});

test('currentSpeaker with 0-len para: user cursor', () => {
  let state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(
    addUuids([
      { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
      { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Three', language: 'test' },
      { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
      { type: 'paragraph_break' },
    ])
  );
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentSpeaker(state)).toBe('Speaker One');
  state = produce(state, (state) => {
    state.cursor.userIndex = 4;
  });
  expect(currentSpeaker(state)).toBe('Speaker Two');
  state = produce(state, (state) => {
    state.cursor.userIndex = 6;
  });
  expect(currentSpeaker(state)).toBe('Speaker Three');
});

test('currentSpeaker before first para break', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(
    addUuids([
      { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
      { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Three', language: 'test' },
      { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
      { type: 'paragraph_break' },
    ])
  );
  state.cursor.current = 'user';
  state.cursor.userIndex = 3;
  expect(currentSpeaker(state)).toBe('Speaker One');
});

test('current item at t=4', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 4;
  expect(currentItem(state)).toMatchObject({
    type: 'text',
    source: 'source-2',
    sourceStart: 2,
    length: 1,
    text: 'One',
    conf: 1,
  });
});

test('speakerIndices', () => {
  const content = _.cloneDeep(testContentLong);
  const contentMacros = memoizedMacroItems(content);
  expect(memoizedSpeakerIndices(contentMacros)).toStrictEqual({
    'Speaker One': 0,
    'Speaker Empty': 1,
    'Speaker Two': 2,
  });
});

test('speakerIndices: empty doc', () => {
  const contentMacros = memoizedMacroItems([]);
  expect(memoizedSpeakerIndices(contentMacros)).toStrictEqual({});
});

test('speakerIndices: doc with only speaker changes and para breaks', () => {
  const contentMacros = memoizedMacroItems(
    addUuids([
      { type: 'paragraph_start', speaker: '', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: '', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
      { type: 'paragraph_break' },
      { type: 'paragraph_start', speaker: '', language: 'test' },
      { type: 'paragraph_break' },
    ])
  );
  expect(memoizedSpeakerIndices(contentMacros)).toStrictEqual({
    'Speaker One': 0,
    'Speaker Two': 1,
  });
});

test('firstPossibleCursorPosition', () => {
  expect(
    firstPossibleCursorPosition(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
  ).toBe(1);

  expect(
    firstPossibleCursorPosition(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker One', language: 'test' },
        { type: 'paragraph_break' },
        { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
        { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
  ).toBe(1);

  expect(
    firstPossibleCursorPosition(
      addUuids([
        { type: 'paragraph_start', speaker: 'Speaker Two', language: 'test' },
        { type: 'text', length: 1, sourceStart: 1, source: 'source-1', text: 'One', conf: 1 },
        { type: 'paragraph_break' },
      ])
    )
  ).toBe(1);
});

test('current index left with user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 2;
  expect(currentIndexLeft(state)).toStrictEqual(1);
});

test('current index left with user cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'user';
  state.cursor.userIndex = 0;
  expect(currentIndexLeft(state)).toStrictEqual(-1);
});

test('current index left with player cursor', () => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
  state.cursor.current = 'player';
  state.cursor.playerTime = 1;
  expect(currentIndexLeft(state)).toStrictEqual(1);
});

test.each([1.1, 1.25, 1.5, 1.75, 2])('current index left with player cursor at t=%ds', (time) => {
  const state = _.cloneDeep(defaultEditorState);
  state.document.content = _.cloneDeep(testContentLong);
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

const testMacroItems: V3UntimedMacroItem[] = [
  { type: 'paragraph', speaker: 'Something Something', language: null, content: [] },
  {
    type: 'paragraph',
    speaker: 'Speaker One',
    language: 'test',
    content: [
      {
        type: 'text',
        text: 'One',
        conf: 1,
        source: 'source-1',
        sourceStart: 0,
        length: 1,
        uuid: '1',
      },
      {
        type: 'text',
        text: 'Two',
        conf: 1,
        source: 'source-2',
        sourceStart: 1,
        length: 1,
        uuid: '2',
      },
      {
        type: 'text',
        text: 'Three Four',
        conf: 1,
        source: 'source-1',
        sourceStart: 2,
        length: 1,
        uuid: '3',
      },
    ],
  },
  {
    type: 'paragraph',
    speaker: 'Speaker Two',
    language: 'en',
    content: [
      {
        type: 'text',
        text: 'Five',
        conf: 1,
        source: 'source-2',
        sourceStart: 0,
        length: 1,
        uuid: '4',
      },
      {
        type: 'text',
        text: 'Six',
        conf: 1,
        source: 'source-1',
        sourceStart: 1,
        length: 1,
        uuid: '5',
      },
      {
        type: 'text',
        text: 'Seven Eight',
        conf: 1,
        source: 'source-2',
        sourceStart: 2,
        length: 1,
        uuid: '6',
      },
    ],
  },
  { type: 'paragraph', speaker: 'Speaker Two', language: null, content: [] },
  {
    type: 'paragraph',
    speaker: 'Speaker Three',
    language: null,
    content: [
      {
        type: 'text',
        text: 'Something',
        conf: 1,
        source: 'source-4',
        sourceStart: 0,
        length: 1,
        uuid: '7',
      },
      {
        type: 'text',
        text: 'Something',
        conf: 1,
        source: 'source-4',
        sourceStart: 1,
        length: 1,
        uuid: '8',
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
