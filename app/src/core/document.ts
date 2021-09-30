import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { ctx } from './webaudio';
import { basename } from 'path';
import { GeneratorBox, map } from '../util/itertools';
import { v4 as uuidv4 } from 'uuid';
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
  decoded: AudioBuffer;
}
export interface DocumentGeneric<S, I> {
  sources: Record<string, S>;
  content: ParagraphGeneric<I>[];
}
export type Document = DocumentGeneric<Source, ParagraphItem>;

export async function deserializeDocumentFromFile(path: string): Promise<Document> {
  const zipBinary = readFileSync(path);
  return await deserializeDocument(zipBinary);
}
export async function deserializeDocument(zipBinary: Buffer): Promise<Document> {
  const zip = await JSZip.loadAsync(zipBinary);
  const documentFile = zip.file('document.json');
  if (!documentFile) {
    throw Error('document.json missing in audapolis file');
  }
  const content = JSON.parse(await documentFile.async('text')) as ParagraphGeneric<ParagraphItem>[];
  const sourceFiles = zip.file(/^sources\//);
  console.log(sourceFiles);
  const sources = Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (file) => {
        console.log('namefile', file.name);
        const fileContents = await file.async('arraybuffer');
        console.log('filecontent', fileContents);
        const decoded = await ctx.decodeAudioData(fileContents.slice(0));
        return [basename(file.name), { fileContents, decoded }];
      })
    )
  );

  // TODO: check that all sources referenced in items are found in zip file

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

  const encodedDocument: ParagraphGeneric<ParagraphItem>[] = document.content;
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
          absoluteStart: accumulatedTime,
          ...item,
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

export class DocumentGenerator<T extends DocumentGeneratorItem> extends GeneratorBox<T> {
  static fromParagraphs(content: Paragraph[]): DocumentGenerator<DocumentGeneratorItem> {
    return new DocumentGenerator(rawDocumentIterator(content));
  }

  skipToTime(targetTime: number, alwaysLast?: boolean, before?: boolean): DocumentGenerator<T> {
    return new DocumentGenerator(rawSkipToTime(this, targetTime, alwaysLast, before));
  }

  itemMap(mapper: (x: DocumentGeneratorItem) => DocumentGeneratorItem): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(map(mapper, this));
  }

  toParagraphs(): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    let lastParagraph = null;
    for (const item of this) {
      if (lastParagraph != item.paragraphUuid) {
        paragraphs.push({ speaker: item.speaker, content: [item] });
      } else {
        // eslint-disable-next-line unused-imports/no-unused-vars
        const { absoluteStart, paragraphUuid, itemIdx, speaker, ...rest } = item;
        paragraphs[paragraphs.length - 1].content.push(rest as ParagraphItem);
      }
      lastParagraph = item.paragraphUuid;
    }

    return paragraphs;
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

export function getCurrentItem(
  document: Paragraph[],
  time: number,
  prev?: boolean
): DocumentGeneratorItem | void {
  const iter = DocumentGenerator.fromParagraphs(document).skipToTime(time, true, prev);
  return iter.next().value;
}

export interface RenderItem {
  start: number;
  end: number;
  source: string;
}
export function renderItemsFromDocument(document: Document): RenderItem[] {
  const renderItems = [];
  let cur_start = 0;
  let cur_end = 0;
  let cur_source: string | null = null;
  document.content.forEach((paragraph) => {
    paragraph.content.forEach((item) => {
      if (item.type === 'artificial_silence') {
        // TODO: Handle properly
        throw new Error('not implemented');
      }

      if (cur_source == null) {
        cur_start = item.sourceStart;
        cur_end = item.sourceStart + item.length;
        cur_source = item.source;
      } else {
        if (cur_source == item.source && cur_end == item.sourceStart) {
          cur_end = item.sourceStart + item.length;
        } else {
          renderItems.push({ start: cur_start, end: cur_end, source: cur_source });
          cur_start = item.sourceStart;
          cur_end = item.sourceStart + item.length;
          cur_source = item.source;
        }
      }
    });
  });
  if (cur_source != null) {
    renderItems.push({ start: cur_start, end: cur_end, source: cur_source });
  }
  return renderItems;
}
