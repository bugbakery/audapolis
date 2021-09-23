import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { ctx } from './webaudio';

export interface Word {
  type: 'word';
  word: string;

  source: number;
  sourceStart: number;
  length: number;

  conf: number;
}
export interface Silence {
  type: 'silence';

  source: number;
  sourceStart: number;
  length: number;
}
export type ParagraphItem = Word | Silence;

export interface ParagraphGeneric<I> {
  speaker: string;
  content: I[];
}
export type Paragraph = ParagraphGeneric<ParagraphItem>;

export interface Source {
  fileName: string;
  fileContents: ArrayBuffer;
  decoded: AudioBuffer;
}
export interface SerializedSource {
  fileName: string;
}

export interface DocumentGeneric<S, I> {
  sources: S[];
  content: ParagraphGeneric<I>[];
}
export type Document = DocumentGeneric<Source, ParagraphItem>;

export async function deserializeDocument(path: string): Promise<Document> {
  const zipBinary = readFileSync(path);
  const zip = await JSZip.loadAsync(zipBinary);
  const documentFile = zip.file('document.json');
  if (!documentFile) {
    throw Error('document.json missing in audapolis file');
  }
  const document = JSON.parse(await documentFile.async('text')) as Document;

  const sources = await Promise.all(
    document.sources.map(async (source) => {
      const fileName = source.fileName;
      const fileHandle = zip.file(fileName);
      if (!fileHandle) {
        throw Error(
          `audio source file '${fileName}' referenced in document.json but not found in audapolis file`
        );
      }
      const fileContents = await fileHandle.async('arraybuffer');
      const decoded = await ctx.decodeAudioData(fileContents.slice(0));
      return { fileName, fileContents, decoded };
    })
  );

  return { content: document.content, sources };
}
export async function serializeDocument(document: Document, path: string): Promise<void> {
  // TODO: Do we really need to write an entire new file here? Can we check for existing file content and only overwrite
  // what's needed?
  const zip = JSZip();

  const sources = document.sources.map((source) => {
    const fileName = source.fileName;
    zip.file(fileName, source.fileContents);
    return { fileName };
  });

  const encodedDocument: DocumentGeneric<SerializedSource, ParagraphItem> = {
    sources,
    content: document.content,
  };
  zip.file('document.json', JSON.stringify(encodedDocument));

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

type DocumentIteratorItem = TimedParagraphItem & {
  globalIdx: number;
  paragraphIdx: number;
  itemIdx: number;
  speaker: string;
};
type DocumentGenerator = Generator<DocumentIteratorItem, void, undefined>;
export function* documentIterator(content: Paragraph[]): DocumentGenerator {
  let accumulatedTime = 0;
  let globalIdx = 0;
  for (let p = 0; p < content.length; p++) {
    const paragraph = content[p];
    for (let i = 0; i < paragraph.content.length; i++) {
      const item = paragraph.content[i];
      yield {
        ...item,
        absoluteStart: accumulatedTime,
        globalIdx,
        paragraphIdx: p,
        itemIdx: i,
        speaker: paragraph.speaker,
      };
      accumulatedTime += item.length;
      globalIdx += 1;
    }
  }
}
export function* filterItems(
  predicate: (x: DocumentIteratorItem) => boolean,
  iterator: DocumentGenerator
): DocumentGenerator {
  let globalIdx = 0;
  for (const item of iterator) {
    if (predicate(item)) {
      yield { ...item, globalIdx };
      globalIdx += 1;
    }
  }
}
export function* skipToTime(
  targetTime: number,
  iterator: DocumentGenerator,
  alwaysLast?: boolean,
  before?: boolean
): DocumentGenerator {
  let last = null;
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

export function documentFromIterator(iter: DocumentGenerator): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let lastParagraph = -1;
  for (const item of iter) {
    if (lastParagraph < item.paragraphIdx) {
      paragraphs.push({ speaker: item.speaker, content: [item] });
    } else {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { absoluteStart, paragraphIdx, itemIdx, globalIdx, speaker, ...rest } = item;
      paragraphs[paragraphs.length - 1].content.push(rest);
    }
    lastParagraph = item.paragraphIdx;
  }

  return paragraphs;
}

export function getCurrentItem(
  document: Paragraph[],
  time: number,
  prev?: boolean
): DocumentIteratorItem | void {
  const iter = skipToTime(time, documentIterator(document), true, prev);
  return iter.next().value;
}

export interface RenderItem {
  start: number;
  end: number;
  source: number;
}
export function renderItemsFromDocument(document: Document): RenderItem[] {
  const renderItems = [];
  let cur_start = 0;
  let cur_end = 0;
  let cur_source: number | null = null;
  document.content.forEach((paragraph) => {
    paragraph.content.forEach((item) => {
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
