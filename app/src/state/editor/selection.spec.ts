import { editorDefaults, EditorState, Range } from './types';
import { DocumentGenerator, emptyDocument, getItemsAtTime, Paragraph } from '../../core/document';
import { selectLeft, selectRight } from './selection';
import { EPSILON } from '../../util';

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

type DirectionalRange = Range & { ltr: boolean };
const directionalRangeToSelection = (directionalRange: DirectionalRange) => {
  const startTime = directionalRange.start + (directionalRange.ltr ? 0 : directionalRange.length);
  const startItems = getItemsAtTime(DocumentGenerator.fromParagraphs(testContent), startTime);
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { paragraphUuid, ...startItem } =
    startItems[directionalRange.ltr ? startItems.length - 1 : 0];

  return {
    range: {
      start: directionalRange.start,
      length: directionalRange.length,
    },
    startItem: startItem,
  };
};

const testRight = (before: DirectionalRange | number, after: DirectionalRange) => {
  const state = JSON.parse(JSON.stringify(testState));
  if (typeof before == 'number') {
    state.currentTimePlayer = before;
  } else {
    state.selection = directionalRangeToSelection(before);
  }
  selectRight.reducer(state);
  expect(state.selection).toMatchObject(directionalRangeToSelection(after));
};

test('selectRight start selection at 0', () => {
  testRight(0, { start: 0, length: 1, ltr: true });
});
test('selectRight start selection at 0.4', () => {
  testRight(0.4, { start: 0, length: 1, ltr: true });
});
test('selectRight start selection at 0.6', () => {
  testRight(0.6, { start: 0, length: 1, ltr: true });
});
test('selectRight start selection at 1', () => {
  testRight(1, { start: 1, length: 1, ltr: true });
});
test('selectRight start selection at end of paragraph', () => {
  testRight(3 - EPSILON, { start: 3, length: 1, ltr: true });
});

test('selectRight extend ltr selection', () => {
  testRight({ start: 1, length: 1, ltr: true }, { start: 1, length: 2, ltr: true });
});
test('selectRight shrink non-ltr selection', () => {
  testRight({ start: 1, length: 2, ltr: false }, { start: 2, length: 1, ltr: false });
});
test('selectRight convert non-ltr to ltr', () => {
  testRight({ start: 1, length: 1, ltr: false }, { start: 1, length: 2, ltr: true });
});

const testLeft = (before: DirectionalRange | number, after: DirectionalRange) => {
  const state = JSON.parse(JSON.stringify(testState));
  if (typeof before == 'number') {
    state.currentTimePlayer = before;
  } else {
    state.selection = directionalRangeToSelection(before);
  }
  selectLeft.reducer(state);
  expect(state.selection).toMatchObject(directionalRangeToSelection(after));
};

test('selectLeft start selection at 0', () => {
  testLeft(0, { start: 0, length: 1, ltr: false });
});
test('selectLeft start selection at 1', () => {
  testLeft(1, { start: 0, length: 1, ltr: false });
});
test('selectLeft start selection at 2', () => {
  testLeft(2, { start: 1, length: 1, ltr: false });
});
test('selectLeft start selection at end of paragraph', () => {
  testLeft(3 - EPSILON, { start: 2, length: 1, ltr: false });
});

test('selectLeft extend non-ltr selection', () => {
  testLeft({ start: 1, length: 1, ltr: false }, { start: 0, length: 2, ltr: false });
});
test('selectLeft shrink ltr selection', () => {
  testLeft({ start: 1, length: 2, ltr: true }, { start: 1, length: 1, ltr: false });
});
test('selectRight convert ltr to non-ltr', () => {
  testLeft({ start: 1, length: 1, ltr: true }, { start: 0, length: 2, ltr: false });
});
