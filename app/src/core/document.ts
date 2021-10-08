import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import { GeneratorBox, map } from '../util/itertools';
import { v4 as uuidv4 } from 'uuid';
import { roughEq } from '../util';
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

export type ParagraphItem = Word | Silence | ArtificialSilence;

export interface ParagraphGeneric<I> {
  speaker: string;
  content: I[];
}
export type Paragraph = ParagraphGeneric<ParagraphItem>;

export interface Source {
  fileContents: ArrayBuffer;
  objectUrl: string;
}
export interface DocumentGeneric<S, I> {
  sources: Record<string, S>;
  content: ParagraphGeneric<I>[];
}
export type Document = DocumentGeneric<Source, ParagraphItem>;

/**
 * The file versions of audapolis are not the same as the actual release versions of the app.
 * They should be changed any time a breaking update to the file structure happens but it is not necessary to bump them
 * when a new audapolis version is released.
 */
type DocumentPreV1Json = ParagraphGeneric<ParagraphItem>[];
interface DocumentV1Json {
  version: 1;
  content: ParagraphGeneric<ParagraphItem>[];
}
type DocumentJson = DocumentV1Json | DocumentPreV1Json;

export async function deserializeDocumentFromFile(
  path: string,
  onNoSourceLoad?: (noSourceDocument: Document) => void
): Promise<Document> {
  const zipBinary = readFileSync(path);
  return await deserializeDocument(zipBinary, onNoSourceLoad);
}
export async function deserializeDocument(
  zipBinary: Buffer,
  onNoSourceLoad?: (noSourceDocument: Document) => void
): Promise<Document> {
  const zip = await JSZip.loadAsync(zipBinary);
  const documentFile = zip.file('document.json');
  if (!documentFile) {
    throw Error('document.json missing in audapolis file');
  }
  const parsed = JSON.parse(await documentFile.async('text')) as DocumentJson;
  let content;
  if (!('version' in parsed)) {
    throw new Error(
      'Unversioned audapolis files are not supported anymore.\nProbably your audapolis file is corrupt.'
    );
  } else if (parsed.version == 1) {
    content = parsed.content;
  } else {
    throw new Error(
      `Cant open document with version ${parsed.version} with current audapolis version.\nMaybe try updating audapolis?`
    );
  }

  if (onNoSourceLoad) {
    onNoSourceLoad({ content, sources: {} });
  }
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

  return { content, sources };
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

export type TimedParagraphItem = ParagraphItem & { absoluteStart: number };
export function computeTimed(content: Paragraph[]): ParagraphGeneric<TimedParagraphItem>[] {
  let accumulatedTime = 0;
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

export type DocumentGeneratorItem = TimedParagraphItem & {
  paragraphUuid: string;
  itemIdx: number;

  speaker: string;
};

export class DocumentGenerator<
  T extends DocumentGeneratorItem = DocumentGeneratorItem
> extends GeneratorBox<T> {
  static fromParagraphs(content: Paragraph[]): DocumentGenerator {
    return new DocumentGenerator(rawDocumentIterator(content));
  }

  skipToTime(targetTime: number, alwaysLast?: boolean, before?: boolean): DocumentGenerator<T> {
    return new DocumentGenerator(rawSkipToTime(this, targetTime, alwaysLast, before));
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

  toParagraphs(): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    let lastParagraph = null;
    for (const item of this) {
      const generatorItemToParagraphItem = (item: DocumentGeneratorItem): ParagraphItem => {
        // eslint-disable-next-line unused-imports/no-unused-vars
        const { absoluteStart, paragraphUuid, itemIdx, speaker, ...rest } = item;
        return rest;
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
}

function* rawDocumentIterator(content: Paragraph[]): Generator<DocumentGeneratorItem> {
  let accumulatedTime = 0;
  for (let p = 0; p < content.length; p++) {
    const paragraph = content[p];
    const paragraphUuid = uuidv4();
    for (let i = 0; i < paragraph.content.length; i++) {
      const item = paragraph.content[i];
      yield {
        ...item,
        absoluteStart: accumulatedTime,
        paragraphUuid,
        itemIdx: i,
        speaker: paragraph.speaker,
      };
      accumulatedTime += item.length;
    }
  }
}

export function* rawSkipToTime<I extends DocumentGeneratorItem>(
  iterator: DocumentGenerator<I>,
  targetTime: number,
  alwaysLast?: boolean,
  before?: boolean
): Generator<I> {
  let last: I | null = null;
  for (const item of iterator) {
    if (item.absoluteStart + item.length <= targetTime) {
      last = item;
    } else {
      if (before && last) {
        yield last;
      }
      yield item;
      last = null;
    }
  }

  if (alwaysLast && last) {
    yield last;
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
    if (first && length >= 0) {
      const modified = {
        ...item,
        ...('sourceStart' in item ? { sourceStart: item.sourceStart + itemStartOffset } : {}),
        absoluteStart: item.absoluteStart + itemStartOffset,
        length: length,
      };
      yield modified;
      first = false;
    } else if (length >= 0) {
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

export interface NonSourceRenderItem {
  absoluteStart: number;
  length: number;
}
export interface SourceRenderItem {
  absoluteStart: number;
  length: number;

  source: string;
  sourceStart: number;
}
export type RenderItem = NonSourceRenderItem | SourceRenderItem;
export function* renderItemsFromDocumentGenerator(gen: DocumentGenerator): Generator<RenderItem> {
  type Current = {
    absoluteStart?: number;
    length: number;
    source?: string;
    sourceStart?: number;
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
      };
    } else if (
      current.source == itemSource &&
      current.sourceStart !== undefined &&
      roughEq(current.sourceStart + current.length, itemSourceStart)
    ) {
      current.length += item.length;
    } else {
      yield current as RenderItem;
      current = {
        absoluteStart: item.absoluteStart,
        length: item.length,
        ...('source' in item ? { source: item.source, sourceStart: item.sourceStart } : {}),
      };
    }
  }
  if (current.absoluteStart !== undefined) {
    yield current as RenderItem;
  }
}

export function getCurrentItem(
  document: Paragraph[],
  time: number,
  prev?: boolean
): DocumentGeneratorItem | void {
  const iter = DocumentGenerator.fromParagraphs(document).skipToTime(time, true, prev);
  return iter.next().value;
}
