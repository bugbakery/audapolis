import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import { memoizedParagraphItems } from '../state/editor/selectors';
import { v4 as uuidv4 } from 'uuid';

/**
 * The file versions of audapolis are not the same as the actual release versions of the app.
 * They should be changed any time a breaking update to the file structure happens but it is not necessary to bump them
 * when a new audapolis version is released.
 */

// V0
type DocumentPreV1Json = V1Paragraph[];

// V1
interface V1DocumentJson {
  version: 1;
  content: V1Paragraph[];
}

export type V1ParagraphItem = V1V2Word | V1V2Silence | V1V2ArtificialSilence;

export interface V1Paragraph<I = V1ParagraphItem> {
  speaker: string;
  content: I[];
}
export type TimedV1ParagraphItem = V1ParagraphItem & { absoluteStart: number };

// V2
interface V2DocumentJson {
  version: 2;
  content: V2DocumentItem[];
}

export type V2TimedDocumentItem = V2DocumentItem & TimedItemExtension;

export interface V1V2Word {
  type: 'word';
  word: string;

  source: string;
  sourceStart: number;
  length: number;

  conf: number;
}
export interface V1V2Silence {
  type: 'silence';

  source: string;
  sourceStart: number;
  length: number;
}

export interface V1V2ArtificialSilence {
  type: 'artificial_silence';
  length: number;
}

type V2MacroItem = V2Paragraph;
export type V2UntimedMacroItem = V2Paragraph<V2DocumentItem>;
export type V2TimedMacroItem = V2MacroItem & TimedItemExtension;
export type V2TimedParagraphItem = V2ParagraphItem & TimedItemExtension;
export interface V2Paragraph<I = V2TimedParagraphItem> {
  type: 'paragraph';
  speaker: string | null;
  content: I[];
}

export interface V2ParagraphBreakItem {
  type: 'paragraph_break';
  speaker: string | null;
}

export type V2ParagraphItem = V1V2Word | V1V2Silence | V1V2ArtificialSilence;
export type V2DocumentItem = V2ParagraphItem | V2ParagraphBreakItem;

// V3

export type TimedItemExtension = { absoluteStart: number; absoluteIndex: number };
export type UuidExtension = { uuid: string };
interface V3DocumentJson {
  version: 3;
  metadata: V3DocumentMetadata;
  content: V3DocumentItem[];
}

interface V3DocumentMetadata {
  display_video: boolean;
  display_speaker_names: boolean;
}

type V3DocumentItemWithoutUuid =
  | V3ParagraphBreakItem
  | V3ParagraphStartItem
  | V3TextItem
  | V3NonTextItem
  | V3ArtificialSilence;

export type V3DocumentItem = V3DocumentItemWithoutUuid & UuidExtension;
export type V3TimedDocumentItem = V3DocumentItem & TimedItemExtension;

export interface V3ParagraphBreakItem {
  type: 'paragraph_break';
}

export interface V3ParagraphStartItem {
  type: 'paragraph_start';

  speaker: string;
  language: string | null;
}

export interface V3TextItem {
  type: 'text';

  source: string;
  sourceStart: number;
  length: number;
  text: string;
  conf: number;
}

export interface V3NonTextItem {
  type: 'non_text';

  source: string;
  sourceStart: number;
  length: number;
}

export interface V3ArtificialSilence {
  type: 'artificial_silence';

  length: number;
}

export type V3TimedParagraphItem = V3ParagraphItem & TimedItemExtension;
export type V3ParagraphItem = (V3TextItem | V3NonTextItem | V3ArtificialSilence) & UuidExtension;

export interface V3Paragraph<I = V3TimedParagraphItem> {
  type: 'paragraph';
  speaker: string;
  language: string | null;
  content: I[];
}

export type V3MacroItem = V3Paragraph;
export type V3UntimedMacroItem = V3Paragraph<V3ParagraphItem>;
export type V3TimedMacroItem = V3MacroItem & TimedItemExtension & { endAbsoluteIndex: number };

//     what is a document?
export interface Source {
  fileContents: ArrayBuffer;
  objectUrl: string;
}
export interface Document<S = Source, I = V3DocumentItem, M = V3DocumentMetadata> {
  sources: Record<string, S>;
  content: I[];
  metadata: M;
}

// Stub: v4 (to prevent typechecking errors)
interface DocumentV4Json {
  version: 4;
}
export type DocumentJson =
  | DocumentV4Json
  | V3DocumentJson
  | V2DocumentJson
  | V1DocumentJson
  | DocumentPreV1Json;

export function getEmptyDocument(): Document {
  return {
    sources: {},
    content: [
      { type: 'paragraph_start', speaker: '', language: null, uuid: uuidv4() },
      { type: 'paragraph_break', uuid: uuidv4() },
    ],
    metadata: { display_speaker_names: false, display_video: false },
  };
}

export async function deserializeDocumentFromFile(
  path: string,
  onSourcesLoad?: (sources: Record<string, Source>) => void
): Promise<Document> {
  const zipBinary = readFileSync(path);
  return await deserializeDocument(zipBinary, onSourcesLoad);
}

/**
 * Deserializes a given audapolis zip file. If a onSourcesLoad callback is provided, the promise this returns will be
 * resolved as soon as the index is read with an empty record for the sources. This means the callback must manually
 * set the sources when they are fully loaded.
 *
 * @param zipBinary the zip that is the audapolis file
 * @param onSourcesLoad the callback that receives the sources oncy they are loaded. Optional: if not given the future this function returns will take longer to be resolved.
 */
export async function deserializeDocument(
  zipBinary: Buffer,
  onSourcesLoad?: (sources: Record<string, Source>) => void
): Promise<Document> {
  const zip = await JSZip.loadAsync(zipBinary);
  const documentFile = zip.file('document.json');
  if (!documentFile) {
    throw Error('document.json missing in audapolis file');
  }
  const parsed = JSON.parse(await documentFile.async('text')) as DocumentJson;
  let partialDocument: Omit<Document, 'sources'>;
  if (!('version' in parsed)) {
    throw new Error(
      'Unversioned audapolis files are not supported anymore.\nProbably your audapolis file is corrupt.'
    );
  } else if (parsed.version == 1) {
    partialDocument = convertV1toV3(parsed);
  } else if (parsed.version == 2) {
    partialDocument = convertV2toV3(parsed);
  } else if (parsed.version == 3) {
    partialDocument = { content: parsed.content, metadata: parsed.metadata }; // TODO @pajowu: validate schema
  } else {
    throw new Error(
      `Cant open document with version ${parsed.version} with current audapolis version.\nMaybe try updating audapolis?`
    );
  }

  // TODO: Only load needed?
  const loadSources = async (): Promise<Record<string, Source>> => {
    const sourceFiles = zip.file(/^sources\//);
    const sources = Object.fromEntries(
      await Promise.all(
        sourceFiles.map(async (file) => {
          const fileContents = await file.async('arraybuffer');
          const objectUrl = URL.createObjectURL(new Blob([fileContents]));
          return [basename(file.name), { fileContents, objectUrl }];
        })
      )
    );

    for (const v of memoizedParagraphItems(partialDocument.content)) {
      if ('source' in v && sources[v.source] === undefined) {
        throw new Error(
          `Source ${v.source} is referenced in audapolis file but not present. Your Audapolis file is corrupt :(`
        );
      }
    }
    return sources;
  };

  if (onSourcesLoad) {
    setTimeout(async () => {
      onSourcesLoad(await loadSources());
    });
    return { sources: {}, ...partialDocument };
  } else {
    const sources = await loadSources();
    return { sources, ...partialDocument };
  }
}

function paragraphItemV1V2toV3(item: V1ParagraphItem | V2ParagraphItem): V3DocumentItem {
  switch (item.type) {
    case 'word':
      return {
        type: 'text',
        uuid: uuidv4(),
        length: item.length,
        source: item.source,
        sourceStart: item.sourceStart,
        conf: item.conf,
        text: item.word,
      };
    case 'silence':
      return {
        type: 'non_text',
        uuid: uuidv4(),
        length: item.length,
        source: item.source,
        sourceStart: item.sourceStart,
      };
    case 'artificial_silence':
      return { type: 'artificial_silence', uuid: uuidv4(), length: item.length };
  }
}

function paragraphV1toV3Items(paragraph: V1Paragraph): V3DocumentItem[] {
  return [
    { type: 'paragraph_start', uuid: uuidv4(), speaker: paragraph.speaker, language: null },
    ...paragraph.content.map(paragraphItemV1V2toV3),
    {
      type: 'paragraph_break',
      uuid: uuidv4(),
    },
  ];
}

function convertV1toV3(v1_document: V1DocumentJson): Omit<Document, 'sources'> {
  const content = [];
  let last_speaker = null;
  const metadata = { display_speaker_names: false, display_video: false };
  for (const paragraph of v1_document.content) {
    content.push(...paragraphV1toV3Items(paragraph));

    if (last_speaker === null) {
      last_speaker = paragraph.speaker;
    }
    if (last_speaker !== paragraph.speaker) {
      metadata.display_speaker_names = true;
    }
  }

  return { content: content, metadata: metadata };
}
function convertV2toV3(v2_document: V2DocumentJson): Omit<Document, 'sources'> {
  let content: V3DocumentItem[] = [];
  for (const item of v2_document.content) {
    switch (item.type) {
      case 'paragraph_break':
        if (content.length > 0) {
          content.push({ type: 'paragraph_break', uuid: uuidv4() });
        }
        if (item.speaker !== null) {
          content.push({
            type: 'paragraph_start',
            uuid: uuidv4(),
            speaker: item.speaker,
            language: null,
          });
        }
        break;
      case 'word':
      case 'silence':
      case 'artificial_silence':
        content.push(paragraphItemV1V2toV3(item));
    }
  }
  if (content.length > 0) {
    content.push({ type: 'paragraph_break', uuid: uuidv4() });
  } else {
    content = getEmptyDocument().content;
  }
  return { content, metadata: { display_speaker_names: false, display_video: false } };
}

export function serializeDocument(document: Document): JSZip {
  // TODO: Do we really need to write an entire new file here? Can we check for existing file content and only overwrite
  // what's needed?
  const zip = JSZip();

  const neededSources = new Set(
    memoizedParagraphItems(document.content)
      .map((v) => ('source' in v ? v.source : undefined))
      .filter((x) => x !== undefined)
  );

  Object.entries(document.sources)
    .filter(([hash, _]) => neededSources.has(hash))
    .map(([k, source]) => {
      zip.file(`sources/${k}`, source.fileContents);
    });

  const encodedDocument: V3DocumentJson = {
    version: 3,
    content: document.content,
    metadata: document.metadata,
  };
  zip.file('document.json', JSON.stringify(encodedDocument));
  return zip;
}

export function serializeDocumentToFile(document: Document, path: string): Promise<void> {
  const zip = serializeDocument(document);
  return new Promise((resolve, reject) => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(createWriteStream(path))
      .on('finish', resolve)
      .on('error', reject);
  });
}

///

export type RenderItem = SilenceRenderItem | SourceRenderItem;
export interface SilenceRenderItem {
  type: 'silence';

  absoluteStart: number;
  length: number;
}
export interface SourceRenderItem {
  type: 'media';

  absoluteStart: number;
  length: number;

  source: string;
  sourceStart: number;
  speaker: string;
}
