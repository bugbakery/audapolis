import { emptyDocument, Paragraph } from '../../core/document';
import { editorDefaults, EditorState } from './types';
import { deleteSelection, deleteSomething } from './edit';
import { EPSILON } from '../../util';

const testContent: Paragraph[] = [
  {
    speaker: 'paragraph_01',
    content: [
      { type: 'silence', length: 1, source: '', sourceStart: 0 },
      { type: 'silence', length: 1, source: '', sourceStart: 1 },
      { type: 'silence', length: 1, source: '', sourceStart: 2 },
    ],
  },
  {
    speaker: 'paragraph_02',
    content: [
      { type: 'silence', length: 1, source: '', sourceStart: 0 },
      { type: 'silence', length: 1, source: '', sourceStart: 1 },
      { type: 'silence', length: 1, source: '', sourceStart: 2 },
    ],
  },
];

test('deleteSelection basic', () => {
  const state: EditorState = {
    ...editorDefaults,
    document: { ...emptyDocument, content: JSON.parse(JSON.stringify(testContent)) },
    selection: {
      startItem: { type: 'silence', length: 1, source: '', sourceStart: 1, absoluteStart: 1 },
      range: {
        start: 1,
        length: 1,
      },
    },
  };
  deleteSelection.reducer(state);
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'silence', length: 1, source: '', sourceStart: 0 },
        { type: 'silence', length: 1, source: '', sourceStart: 2 },
      ],
    },
    {
      speaker: 'paragraph_02',
      content: [
        { type: 'silence', length: 1, source: '', sourceStart: 0 },
        { type: 'silence', length: 1, source: '', sourceStart: 1 },
        { type: 'silence', length: 1, source: '', sourceStart: 2 },
      ],
    },
  ]);
  expect(state.currentTimeUserSet).toBe(1);
});
test('deleteSelection end of paragraph', () => {
  const state: EditorState = {
    ...editorDefaults,
    document: { ...emptyDocument, content: JSON.parse(JSON.stringify(testContent)) },
    currentTimePlayer: 2.0,
    selection: {
      startItem: { type: 'silence', length: 1, source: '', sourceStart: 2, absoluteStart: 2 },
      range: {
        start: 2,
        length: 1,
      },
    },
  };
  deleteSelection.reducer(state);
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'silence', length: 1, source: '', sourceStart: 0 },
        { type: 'silence', length: 1, source: '', sourceStart: 1 },
      ],
    },
    {
      speaker: 'paragraph_02',
      content: [
        { type: 'silence', length: 1, source: '', sourceStart: 0 },
        { type: 'silence', length: 1, source: '', sourceStart: 1 },
        { type: 'silence', length: 1, source: '', sourceStart: 2 },
      ],
    },
  ]);
  expect(state.currentTimeUserSet).toBe(2 - EPSILON);
});
test('deleteSomething end of paragraph', () => {
  const state: EditorState = {
    ...editorDefaults,
    document: { ...emptyDocument, content: JSON.parse(JSON.stringify(testContent)) },
    currentTimePlayer: 3.0 - EPSILON,
  };
  deleteSomething.reducer(state);
  deleteSomething.reducer(state);
  expect(state.document.content).toMatchObject([
    {
      speaker: 'paragraph_01',
      content: [
        { type: 'silence', length: 1, source: '', sourceStart: 0 },
        { type: 'silence', length: 1, source: '', sourceStart: 1 },
      ],
    },
    {
      speaker: 'paragraph_02',
      content: [
        { type: 'silence', length: 1, source: '', sourceStart: 0 },
        { type: 'silence', length: 1, source: '', sourceStart: 1 },
        { type: 'silence', length: 1, source: '', sourceStart: 2 },
      ],
    },
  ]);
  expect(state.currentTimeUserSet).toBe(2 - EPSILON);
});
