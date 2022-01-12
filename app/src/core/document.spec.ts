import { DocumentGenerator, getItemsAtTime, Paragraph, RenderItem } from './document';

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
  expect(documentGenerator.exactFrom(1.5).toParagraphs()).toMatchObject(expectedOutput);
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
  expect(documentGenerator.exactFrom(1).toParagraphs()).toMatchObject(expectedOutput);
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
  expect(documentGenerator.exactUntil(1.5).toParagraphs()).toMatchObject(expectedOutput);
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
      speaker: 'someone',
    },
    {
      absoluteStart: 2,
      length: 1,

      source: 'source_2',
      sourceStart: 2,
      speaker: 'someone',
    },
    {
      absoluteStart: 3,
      length: 1,

      source: 'source_2',
      sourceStart: 2,
      speaker: 'someone',
    },
  ];
  const documentGenerator = DocumentGenerator.fromParagraphs(input);
  expect(documentGenerator.toRenderItems().collect()).toMatchObject(expectedOutput);
});

test('getItemsAtTime', () => {
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

  expect(getItemsAtTime(DocumentGenerator.fromParagraphs(testContent), 0.5)).toMatchObject([
    {
      absoluteStart: 0,
      itemIdx: 0,
      length: 1,
      speaker: 'paragraph_01',
      type: 'artificial_silence',
    },
  ]);

  expect(getItemsAtTime(DocumentGenerator.fromParagraphs(testContent), 1.5)).toMatchObject([
    {
      absoluteStart: 1,
      itemIdx: 1,
      length: 1,
      speaker: 'paragraph_01',
      type: 'artificial_silence',
    },
  ]);

  expect(getItemsAtTime(DocumentGenerator.fromParagraphs(testContent), 3.0)).toMatchObject([
    {
      absoluteStart: 2,
      itemIdx: 2,
      length: 1,
      speaker: 'paragraph_01',
      type: 'artificial_silence',
    },
    {
      absoluteStart: 3,
      itemIdx: 0,
      length: 1,
      speaker: 'paragraph_02',
      type: 'artificial_silence',
    },
  ]);
});
