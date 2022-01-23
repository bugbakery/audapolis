import { defaultEditorState, EditorState } from './types';
import { emptyDocument, V1Paragraph } from '../../core/document';
import { goLeft, goRight } from './play';
import { EPSILON } from '../../util';

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

const testState: EditorState = {
  ...defaultEditorState,
  document: {
    ...emptyDocument,
    content: testContent,
  },
};

const testLeft = (before: number, after: number) => {
  const state = testState;
  state.currentTimePlayer = before;
  goLeft.reducer(state);
  expect(state.currentTimeUserSet).toBe(after);
};
test('goLeft trivial', () => {
  testLeft(2.0, 1.0);
  testLeft(1.0, 0.0);
  testLeft(0.0, 0.0);
});
test('goLeft start of paragraph', () => {
  testLeft(4.0, 3.0);
  testLeft(3.0, 3.0 - 2 * EPSILON);
  testLeft(3.0 - 2 * EPSILON, 2.0);
});

const testRight = (before: number, after: number) => {
  const state = testState;
  state.currentTimePlayer = before;
  goRight.reducer(state);
  expect(state.currentTimeUserSet).toBe(after);
};
test('goRight trivial', () => {
  testRight(0.0, 1.0);
  testRight(1.0, 2.0);
  testRight(1.5, 2.0);
  testRight(3.0, 4.0);
  testRight(6.0, 6.0);
});

test('goRight end of paragraph', () => {
  testRight(2.0, 3.0 - 2 * EPSILON);
  testRight(3.0 - 2 * EPSILON, 3.0);
});
