import { paste } from './edit';
import { emptyDocument, V1Paragraph } from '../../core/document';
import { defaultEditorState, EditorState } from './types';
import { assertSome, EPSILON } from '../../util';

const testContent: V1Paragraph[] = [
  {
    speaker: 'paragraph_01',
    content: [
      { type: 'artificial_silence', length: 1 },
      { type: 'artificial_silence', length: 1 },
      { type: 'artificial_silence', length: 1 },
    ],
  },
  {
    speaker: 'paragraph_02',
    content: [
      { type: 'artificial_silence', length: 1 },
      { type: 'artificial_silence', length: 1 },
      { type: 'artificial_silence', length: 1 },
    ],
  },
];

test('test paste merge', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: { ...emptyDocument, content: JSON.parse(JSON.stringify(testContent)) },
    currentTimePlayer: 1.0,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, {
    ...emptyDocument,
    content: [
      {
        speaker: 'paragraph_01',
        content: [
          { type: 'artificial_silence', length: 1 },
          { type: 'artificial_silence', length: 1 },
          { type: 'artificial_silence', length: 1 },
        ],
      },
    ],
  });
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
      ],
    },
    {
      speaker: 'paragraph_02',
      content: [
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
      ],
    },
  ]);
});
test('test paste non-merge', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: { ...emptyDocument, content: JSON.parse(JSON.stringify(testContent)) },
    currentTimePlayer: 1.0,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, {
    ...emptyDocument,
    content: [
      {
        speaker: 'paragraph_02',
        content: [
          { type: 'artificial_silence', length: 1 },
          { type: 'artificial_silence', length: 1 },
          { type: 'artificial_silence', length: 1 },
        ],
      },
    ],
  });
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [{ type: 'artificial_silence', length: 1 }],
    },
    {
      speaker: 'paragraph_02',
      content: [
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
      ],
    },
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
      ],
    },
    {
      speaker: 'paragraph_02',
      content: [
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
        { type: 'artificial_silence', length: 1 },
      ],
    },
  ]);
});

test('test paste merge end of paragraph', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: {
      ...emptyDocument,
      content: [
        {
          speaker: 'paragraph_01',
          content: [
            { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
          ],
        },
        {
          speaker: 'paragraph_01',
          content: [
            { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
          ],
        },
      ],
    },
    currentTimePlayer: 3.0 - EPSILON,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, {
    ...emptyDocument,
    content: [
      {
        speaker: 'paragraph_01',
        content: [{ type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 }],
      },
    ],
  });
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 },
      ],
    },
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
      ],
    },
  ]);
});
test('test paste merge start of paragraph', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: {
      ...emptyDocument,
      content: [
        {
          speaker: 'paragraph_01',
          content: [
            { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
          ],
        },
        {
          speaker: 'paragraph_01',
          content: [
            { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
          ],
        },
      ],
    },
    currentTimePlayer: 3.0,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, {
    ...emptyDocument,
    content: [
      {
        speaker: 'paragraph_01',
        content: [{ type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 }],
      },
    ],
  });
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
      ],
    },
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
      ],
    },
  ]);
});

test('test paste beginning', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: {
      ...emptyDocument,
      content: [
        {
          speaker: 'paragraph_01',
          content: [
            { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
          ],
        },
      ],
    },
    currentTimePlayer: 0,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, {
    ...emptyDocument,
    content: [
      {
        speaker: 'paragraph_01',
        content: [{ type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 }],
      },
    ],
  });
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
      ],
    },
  ]);
});
test('test paste end', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: {
      ...emptyDocument,
      content: [
        {
          speaker: 'paragraph_01',
          content: [
            { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
            { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
          ],
        },
      ],
    },
    currentTimePlayer: 3.0,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, {
    ...emptyDocument,
    content: [
      {
        speaker: 'paragraph_01',
        content: [{ type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 }],
      },
    ],
  });
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'word', length: 1, source: '', sourceStart: 0, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 1, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 2, word: '', conf: 1 },
        { type: 'word', length: 1, source: '', sourceStart: 3, word: '', conf: 1 },
      ],
    },
  ]);
});

test('test paste empty', () => {
  const state: EditorState = {
    ...defaultEditorState,
    document: {
      ...emptyDocument,
      content: JSON.parse(JSON.stringify(testContent)),
    },
    currentTimePlayer: 2,
  };
  assertSome(paste.reducers);
  assertSome(paste.reducers.fulfilled);
  paste.reducers.fulfilled(state, emptyDocument);
  expect(state.document.content).toMatchObject(testContent);
});
