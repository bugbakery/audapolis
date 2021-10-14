import { DocumentGenerator, Paragraph, RenderItem } from './document';

test('rawExactFrom behaves correctly', () => {
  const defaultWord = {
    conf: 1,
    source: 'some_source',
  };
  const input: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          word: 'w1',
          ...defaultWord,
          sourceStart: 0,
          length: 1,
        },
        {
          type: 'word',
          word: 'w2',
          ...defaultWord,
          sourceStart: 1,
          length: 1,
        },
        {
          type: 'word',
          word: 'w3',
          ...defaultWord,
          sourceStart: 2,
          length: 1,
        },
      ],
    },
  ];
  const expectedOutput: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          word: 'w2',
          ...defaultWord,
          sourceStart: 1.5,
          length: 0.5,
        },
        {
          type: 'word',
          word: 'w3',
          ...defaultWord,
          sourceStart: 2,
          length: 1,
        },
      ],
    },
  ];
  const documentGenerator = DocumentGenerator.fromParagraphs(input);
  expect(documentGenerator.exactFrom(1.5).toParagraphs()).toEqual(expectedOutput);
});

test('rawExactFrom behaves correctly on edge cases', () => {
  const defaultWord = {
    conf: 1,
    source: 'some_source',
  };
  const input: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          word: 'w1',
          ...defaultWord,
          sourceStart: 0,
          length: 1,
        },
        {
          type: 'word',
          word: 'w2',
          ...defaultWord,
          sourceStart: 1,
          length: 1,
        },
        {
          type: 'word',
          word: 'w3',
          ...defaultWord,
          sourceStart: 2,
          length: 1,
        },
      ],
    },
  ];
  const expectedOutput: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          word: 'w2',
          ...defaultWord,
          sourceStart: 1,
          length: 1,
        },
        {
          type: 'word',
          word: 'w3',
          ...defaultWord,
          sourceStart: 2,
          length: 1,
        },
      ],
    },
  ];
  const documentGenerator = DocumentGenerator.fromParagraphs(input);
  expect(documentGenerator.exactFrom(1).toParagraphs()).toEqual(expectedOutput);
});

test('rawExactUntil behaves correctly', () => {
  const defaultWord = {
    conf: 1,
    source: 'some_source',
  };
  const input: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          word: 'w1',
          ...defaultWord,
          sourceStart: 0,
          length: 1,
        },
        {
          type: 'word',
          word: 'w2',
          ...defaultWord,
          sourceStart: 1,
          length: 1,
        },
        {
          type: 'word',
          word: 'w3',
          ...defaultWord,
          sourceStart: 2,
          length: 1,
        },
      ],
    },
  ];
  const expectedOutput: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          word: 'w1',
          ...defaultWord,
          sourceStart: 0,
          length: 1,
        },
        {
          type: 'word',
          word: 'w2',
          ...defaultWord,
          sourceStart: 1,
          length: 0.5,
        },
      ],
    },
  ];
  const documentGenerator = DocumentGenerator.fromParagraphs(input);
  expect(documentGenerator.exactUntil(1.5).toParagraphs()).toEqual(expectedOutput);
});

test('renderItemsFromDocumentGenerator behaves correctly', () => {
  const defaultWord = {
    conf: 1,
    word: 'some_word',
  };
  const input: Paragraph[] = [
    {
      speaker: 'someone',
      content: [
        {
          type: 'word',
          ...defaultWord,
          source: 'source_1',
          sourceStart: 0,
          length: 1,
        },
        {
          type: 'word',
          ...defaultWord,
          source: 'source_1',
          sourceStart: 1,
          length: 1,
        },
        {
          type: 'word',
          ...defaultWord,
          source: 'source_2',
          sourceStart: 2,
          length: 1,
        },
        {
          type: 'word',
          ...defaultWord,
          source: 'source_2',
          sourceStart: 2,
          length: 1,
        },
      ],
    },
  ];
  const expectedOutput: RenderItem[] = [
    {
      absoluteStart: 0,
      length: 2,

      source: 'source_1',
      sourceStart: 0,
    },
    {
      absoluteStart: 2,
      length: 1,

      source: 'source_2',
      sourceStart: 2,
    },
    {
      absoluteStart: 3,
      length: 1,

      source: 'source_2',
      sourceStart: 2,
    },
  ];
  const documentGenerator = DocumentGenerator.fromParagraphs(input);
  expect(documentGenerator.toRenderItems().collect()).toEqual(expectedOutput);
});
