import {
  deserializeDocument,
  Document,
  serializeDocument,
  V1Paragraph,
  V2DocumentItem,
} from './document';
import JSZip from 'jszip';
import { addUuids } from '../util/test_helper';

test('serialization roundtrips', async () => {
  const testDocument: Document = {
    content: addUuids([
      { type: 'paragraph_start', speaker: 'S1', language: null },
      { type: 'text', text: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
      { type: 'paragraph_break' },
    ]),
    sources: {
      'source-1': {
        objectUrl: 'blob://source-1',
        fileContents: new ArrayBuffer(0),
      },
    },
    metadata: {
      display_speaker_names: true,
      display_video: true,
    },
  };
  global.URL.createObjectURL = jest.fn(() => 'MOCKED_URL');
  const serializedDocument = serializeDocument(testDocument);
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  const deserializedDocument = await deserializeDocument(serializedBuffer);
  expect(deserializedDocument.content).toStrictEqual(testDocument.content);
  expect(deserializedDocument.sources).toStrictEqual({
    'source-1': {
      fileContents: new ArrayBuffer(0),
      objectUrl: 'MOCKED_URL',
    },
  });
  expect(deserializedDocument.metadata).toStrictEqual(testDocument.metadata);
});

test('deserialization fails if document.json is missing', async () => {
  const serializedDocument = new JSZip();
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  await expect(deserializeDocument(serializedBuffer)).rejects.toThrow('document.json');
});

test('deserialization fails if source is missing', async () => {
  const testDocument = {
    content: [
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    version: 2,
  };
  const serializedDocument = new JSZip();
  serializedDocument.file('document.json', JSON.stringify(testDocument));
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  await expect(deserializeDocument(serializedBuffer)).rejects.toThrow('source-1');
});

test('deserialization fails if missing version', async () => {
  const testDocument = {
    content: [
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
  };
  const serializedDocument = new JSZip();
  serializedDocument.file('document.json', JSON.stringify(testDocument));
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  await expect(deserializeDocument(serializedBuffer)).rejects.toThrow('version');
});

test('deserialization fails if unknown version', async () => {
  const testDocument = {
    content: [
      { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    ],
    version: 50000,
  };
  const serializedDocument = new JSZip();
  serializedDocument.file('document.json', JSON.stringify(testDocument));
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  await expect(deserializeDocument(serializedBuffer)).rejects.toThrow('version');
});

test('deserialization of v1 succeeds', async () => {
  const testContent: V1Paragraph[] = [
    {
      speaker: 'Speaker One',
      content: [
        { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
      ],
    },
  ];
  global.URL.createObjectURL = jest.fn(() => 'MOCKED_URL');
  const serializedDocument = new JSZip();
  serializedDocument.file('document.json', JSON.stringify({ version: 1, content: testContent }));
  const sources = serializedDocument.folder('sources');
  if (sources == null) {
    throw new Error("couldn't create sources folder");
  }
  sources.file('source-1', 'ABC');
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  const deserializedDocument = await deserializeDocument(serializedBuffer);
  const fileContent = deserializedDocument.sources['source-1'].fileContents;
  const fileAsString = String.fromCharCode.apply(null, new Uint8Array(fileContent));
  expect(fileAsString).toBe('ABC');
  expect(deserializedDocument.content).toStrictEqualExceptUuids([
    { type: 'paragraph_start', speaker: 'Speaker One', language: null },
    { type: 'text', text: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'paragraph_break' },
  ]);
  expect(deserializedDocument.sources).toMatchObject({
    'source-1': {
      objectUrl: 'MOCKED_URL',
    },
  });
});

test('deserialization of v2 succeeds', async () => {
  const testContent: V2DocumentItem[] = [
    { type: 'paragraph_break', speaker: 'Speaker One' },
    { type: 'word', word: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
  ];
  global.URL.createObjectURL = jest.fn(() => 'MOCKED_URL');
  const serializedDocument = new JSZip();
  serializedDocument.file('document.json', JSON.stringify({ version: 2, content: testContent }));
  const sources = serializedDocument.folder('sources');
  if (sources == null) {
    throw new Error("couldn't create sources folder");
  }
  sources.file('source-1', 'ABC');
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  const deserializedDocument = await deserializeDocument(serializedBuffer);
  const fileContent = deserializedDocument.sources['source-1'].fileContents;
  const fileAsString = String.fromCharCode.apply(null, new Uint8Array(fileContent));
  expect(fileAsString).toBe('ABC');
  expect(deserializedDocument.content).toStrictEqualExceptUuids([
    { type: 'paragraph_start', speaker: 'Speaker One', language: null },
    { type: 'text', text: 'One', conf: 1, source: 'source-1', sourceStart: 1, length: 1 },
    { type: 'paragraph_break' },
  ]);
  expect(deserializedDocument.sources).toMatchObject({
    'source-1': {
      objectUrl: 'MOCKED_URL',
    },
  });
});

test('deserialization of empty v2 yields default document', async () => {
  const testContent: V2DocumentItem[] = [];
  global.URL.createObjectURL = jest.fn(() => 'MOCKED_URL');
  const serializedDocument = new JSZip();
  serializedDocument.file('document.json', JSON.stringify({ version: 2, content: testContent }));
  const sources = serializedDocument.folder('sources');
  if (sources == null) {
    throw new Error("couldn't create sources folder");
  }
  sources.file('source-1', 'ABC');
  const serializedBuffer = await serializedDocument.generateAsync({ type: 'nodebuffer' });
  const deserializedDocument = await deserializeDocument(serializedBuffer);
  const fileContent = deserializedDocument.sources['source-1'].fileContents;
  const fileAsString = String.fromCharCode.apply(null, new Uint8Array(fileContent));
  expect(fileAsString).toBe('ABC');
  expect(deserializedDocument.content).toStrictEqualExceptUuids([
    { type: 'paragraph_start', speaker: '', language: null },
    { type: 'paragraph_break' },
  ]);
  expect(deserializedDocument.sources).toMatchObject({
    'source-1': {
      objectUrl: 'MOCKED_URL',
    },
  });
});
