import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import { GeneratorBox, map } from '../util/itertools';
import { v4 as uuidv4 } from 'uuid';
import { EPSILON, roughEq } from '../util';

export type TimedItemExtension = { absoluteStart: number; absoluteIndex: number };
export type TimedDocumentItem = DocumentItem & TimedItemExtension;

export interface Word {
  type: 'word';
  word: string;

  source: string;
  sourceStart: number;
  length: number;

  conf: number;
}
export interface Silence {
  type: 'silence';

  source: string;
  sourceStart: number;
  length: number;
}

export interface ArtificialSilence {
  type: 'artificial_silence';
  length: number;
}

export type V1ParagraphItem = Word | Silence | ArtificialSilence;

export interface V1Paragraph<I = V1ParagraphItem> {
  speaker: string;
  content: I[];
}
type MacroItem = HeadingItem | Paragraph;
export type TimedMacroItem = MacroItem & TimedItemExtension;
export type TimedParagraphItem = ParagraphItem & TimedItemExtension;
export interface Paragraph<I = TimedParagraphItem> {
  speaker: string | null;
  content: I[];
}

export interface Source {
  fileContents: ArrayBuffer;
  objectUrl: string;
}
export interface Document<S = Source, I = DocumentItem> {
  sources: Record<string, S>;
  content: I[];
}

export const emptyDocument: Document = {
  sources: {},
  content: [{ type: 'paragraph_break', speaker: null }],
};

export interface ParagraphBreakItem {
  type: 'paragraph_break';
  speaker: string | null;
}

type HeadingLevel = 1 | 2 | 3;
export interface HeadingItem {
  type: 'heading';
  text: string;
  level: HeadingLevel;
}

export type ParagraphItem = Word | Silence | ArtificialSilence;
export type DocumentItem = ParagraphItem | ParagraphBreakItem | HeadingItem;
/**
 * The file versions of audapolis are not the same as the actual release versions of the app.
 * They should be changed any time a breaking update to the file structure happens but it is not necessary to bump them
 * when a new audapolis version is released.
 */
type DocumentPreV1Json = V1Paragraph[];
interface DocumentV1Json {
  version: 1;
  content: V1Paragraph[];
}
interface DocumentV2Json {
  version: 2;
  content: DocumentItem[];
}
type DocumentJson = DocumentV2Json | DocumentV1Json | DocumentPreV1Json;

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
  let content: V1Paragraph[];
  if (!('version' in parsed)) {
    throw new Error(
      'Unversioned audapolis files are not supported anymore.\nProbably your audapolis file is corrupt.'
    );
  } else if (parsed.version == 1) {
    content = parsed.content;
  } // TODO: V2, convert v1 to v2
  else {
    throw new Error(
      `Cant open document with version ${parsed.version} with current audapolis version.\nMaybe try updating audapolis?`
    );
  }

  const loadSources = async (): Promise<Record<string, Source>> => {
    const sourceFiles = zip.file(/^sources\//);
    console.log(sourceFiles);
    const sources = Object.fromEntries(
      await Promise.all(
        sourceFiles.map(async (file) => {
          console.log('namefile', file.name);
          const fileContents = await file.async('arraybuffer');
          console.log('filecontent', fileContents);
          const objectUrl = URL.createObjectURL(new Blob([fileContents]));
          return [basename(file.name), { fileContents, objectUrl }];
        })
      )
    );

    for (const v of DocumentGenerator.fromParagraphs(content)) {
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
    return { content, sources: {} };
  } else {
    const sources = await loadSources();
    return { content, sources };
  }
}

export function serializeDocument(document: Document): JSZip {
  // TODO: Do we really need to write an entire new file here? Can we check for existing file content and only overwrite
  // what's needed?
  const zip = JSZip();

  const neededSources = new Set(
    DocumentGenerator.fromParagraphs(document.content).filterMap((v) =>
      'source' in v ? v.source : undefined
    )
  );

  Object.entries(document.sources)
    .filter(([hash, _]) => neededSources.has(hash))
    .map(([k, source]) => {
      zip.file(`sources/${k}`, source.fileContents);
    });

  const encodedDocument: DocumentV1Json = { version: 1, content: document.content };
  zip.file('document.json', JSON.stringify(encodedDocument));
  return zip;
}

export async function serializeDocumentToFile(document: Document, path: string): Promise<void> {
  const zip = serializeDocument(document);
  return new Promise((resolve, reject) => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(createWriteStream(path))
      .on('finish', () => {
        resolve();
      })
      .on('error', reject);
  });
}

export type TimedV1ParagraphItem = V1ParagraphItem & { absoluteStart: number };
export function computeTimed(
  content: V1Paragraph[],
  offset = 0
): V1Paragraph<TimedV1ParagraphItem>[] {
  let accumulatedTime = offset;
  return content.map((paragraph) => {
    return {
      ...paragraph,
      content: paragraph.content.map((item) => {
        const mapped = {
          ...item,
          absoluteStart: accumulatedTime,
        };
        accumulatedTime += item.length;
        return mapped;
      }),
    };
  });
}

export type DocumentGeneratorItem = TimedV1ParagraphItem & {
  paragraphUuid: string;
  itemIdx: number; // the index within the containing paragraph. 0 for the first word in a paragraph.
  firstInParagraph: boolean;
  lastInParagraph: boolean;

  speaker: string;
};

export class DocumentGenerator<
  T extends DocumentGeneratorItem = DocumentGeneratorItem
> extends GeneratorBox<T> {
  static fromParagraphs(content: V1Paragraph[]): DocumentGenerator {
    return new DocumentGenerator(rawDocumentIterator(content));
  }

  exactFrom(time: number): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(rawExactFrom(this, time));
  }
  exactUntil(time: number): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(rawExactUntil(this, time));
  }

  itemMap(mapper: (x: DocumentGeneratorItem) => DocumentGeneratorItem): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(map(mapper, this));
  }

  toParagraphs(): V1Paragraph[] {
    const paragraphs: V1Paragraph[] = [];
    let lastParagraph = null;
    for (const item of this) {
      const generatorItemToParagraphItem = (item: DocumentGeneratorItem): V1ParagraphItem => {
        return stripParagraphItemFields(item);
      };

      if (lastParagraph != item.paragraphUuid) {
        paragraphs.push({ speaker: item.speaker, content: [generatorItemToParagraphItem(item)] });
      } else {
        paragraphs[paragraphs.length - 1].content.push(generatorItemToParagraphItem(item));
      }
      lastParagraph = item.paragraphUuid;
    }

    return paragraphs;
  }

  toRenderItems(): GeneratorBox<RenderItem> {
    return new GeneratorBox(renderItemsFromDocumentGenerator(this));
  }

  toTimedParagraphs(): V1Paragraph<TimedV1ParagraphItem>[] {
    const timedParagraphs = [];
    let lastParagraph = null;
    for (const item of this) {
      const generatorItemToParagraphItem = (item: DocumentGeneratorItem): TimedV1ParagraphItem => {
        return { ...stripParagraphItemFields(item), absoluteStart: item.absoluteStart };
      };

      if (lastParagraph != item.paragraphUuid) {
        timedParagraphs.push({
          speaker: item.speaker,
          content: [generatorItemToParagraphItem(item)],
        });
      } else {
        timedParagraphs[timedParagraphs.length - 1].content.push(
          generatorItemToParagraphItem(item)
        );
      }
      lastParagraph = item.paragraphUuid;
    }

    return timedParagraphs;
  }

  getItemsAtTime(time: number): DocumentGeneratorItem[] {
    return getItemsAtTime(this, time);
  }
}

function stripParagraphItemFields<T extends V1ParagraphItem>(x: T): V1ParagraphItem {
  switch (x.type) {
    case 'artificial_silence':
      return { type: 'artificial_silence', length: x.length };
    case 'silence':
      return { type: 'silence', length: x.length, source: x.source, sourceStart: x.sourceStart };
    case 'word':
      return {
        type: 'word',
        length: x.length,
        source: x.source,
        sourceStart: x.sourceStart,
        word: x.word,
        conf: x.conf,
      };
  }
}

export function getDocumentDuration(content: V1Paragraph[]): number {
  let accumulatedTime = 0;
  for (let p = 0; p < content.length; p++) {
    const paragraph = content[p];
    for (let i = 0; i < paragraph.content.length; i++) {
      const item = paragraph.content[i];
      accumulatedTime += item.length;
    }
  }
  return accumulatedTime;
}

function* rawDocumentIterator(content: V1Paragraph[]): Generator<DocumentGeneratorItem> {
  let accumulatedTime = 0;
  for (let p = 0; p < content.length; p++) {
    const paragraph = content[p];
    const paragraphUuid = uuidv4();
    for (let i = 0; i < paragraph.content.length; i++) {
      const item = paragraph.content[i];
      if (item.length < EPSILON) {
        console.warn('really short item: ', item);
      }
      yield {
        ...item,
        absoluteStart: accumulatedTime,
        paragraphUuid,
        itemIdx: i,
        speaker: paragraph.speaker,
        firstInParagraph: i == 0,
        lastInParagraph: i == paragraph.content.length - 1,
      };
      accumulatedTime += item.length;
    }
  }
}

// this is subtly different from the rawSkipToTime method: it modifies even items inside the iterator to achieve
// sub-item time accuracy
export function* rawExactFrom<I extends DocumentGeneratorItem>(
  iterator: DocumentGenerator<I>,
  time: number
): Generator<I> {
  let first = true;
  for (const item of iterator) {
    const itemStartOffset = time - item.absoluteStart;
    const length = item.length - itemStartOffset;
    if (first && length > 0) {
      const modified = {
        ...item,
        ...('sourceStart' in item ? { sourceStart: item.sourceStart + itemStartOffset } : {}),
        absoluteStart: item.absoluteStart + itemStartOffset,
        length: length,
      };
      yield modified;
      first = false;
    } else if (!first && length > 0) {
      yield item;
    }
  }
}
export function* rawExactUntil<I extends DocumentGeneratorItem>(
  iterator: DocumentGenerator<I>,
  time: number
): Generator<I> {
  for (const item of iterator) {
    const newLength = time - item.absoluteStart;
    if (newLength > item.length) {
      yield item;
    } else if (newLength > 0) {
      yield { ...item, length: newLength };
    }
  }
}

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
export type RenderItem = SilenceRenderItem | SourceRenderItem;
export function* renderItemsFromDocumentGenerator(gen: DocumentGenerator): Generator<RenderItem> {
  type Current = {
    absoluteStart?: number;
    length: number;
    source?: string;
    sourceStart?: number;
    speaker?: string;
  };
  let current: Current = {
    length: 0,
  };
  for (const item of gen) {
    const itemSource = 'source' in item ? item.source : undefined;
    const itemSourceStart = 'sourceStart' in item ? item.sourceStart : undefined;
    if (current.absoluteStart === undefined) {
      current = {
        absoluteStart: item.absoluteStart,
        length: item.length,
        sourceStart: itemSourceStart,
        source: itemSource,
        speaker: item.speaker,
      };
    } else if (
      current.source == itemSource &&
      current.sourceStart !== undefined &&
      current.speaker == item.speaker &&
      roughEq(current.sourceStart + current.length, itemSourceStart)
    ) {
      current.length += item.length;
    } else {
      const { absoluteStart, length, source, sourceStart, speaker } = current;
      yield { absoluteStart, length, source, sourceStart, speaker };
      current = {
        absoluteStart: item.absoluteStart,
        length: item.length,
        ...('source' in item
          ? { source: item.source, sourceStart: item.sourceStart, speaker: item.speaker }
          : {}),
      };
    }
  }
  if (current.absoluteStart !== undefined) {
    const { absoluteStart, length, source, sourceStart, speaker } = current;
    yield { absoluteStart, length, source, sourceStart, speaker };
  }
}

export function getItemsAtTime<T extends DocumentGeneratorItem = DocumentGeneratorItem>(
  generator: GeneratorBox<T>,
  time: number
): T[] {
  const condition = (x: T) =>
    x.absoluteStart - EPSILON < time && x.absoluteStart + x.length + EPSILON > time;
  return generator
    .dropwhile((x) => !condition(x))
    .takewhile(condition)
    .collect();
}
