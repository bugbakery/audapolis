import { editorDefaults, EditorState } from './types';
import { emptyDocument, Paragraph } from '../../core/document';
import { goLeft } from './play';

const testContent: Paragraph[] = [
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
  ...editorDefaults,
  document: {
    ...emptyDocument,
    content: testContent,
  },
};

test('goLeft trivial', () => {
  const state = testState;
  state.currentTime = 3.0;

  goLeft.reducer(state);
  expect(state.currentTime).toBe(2.0);

  goLeft.reducer(state);
  expect(state.currentTime).toBe(1.0);

  goLeft.reducer(state);
  expect(state.currentTime).toBe(0.0);
});
