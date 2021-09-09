import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { ctx } from './webaudio';

export interface Word {
  type: 'word';
  word: string;

  source: number;
  start: number;
  end: number;

  conf: number;
}
export interface Silence {
  type: 'silence';

  source: number;
  start: number;
  end: number;
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
      const decoded = await ctx.decodeAudioData(fileContents);
      return { fileName, fileContents, decoded };
    })
  );

  return { content: document.content, sources };
}
export async function serializeDocument(document: Document, path: string): Promise<void> {
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
        accumulatedTime += item.end - item.start;
        return mapped;
      }),
    };
  });
}

type DocumentIteratorItem = TimedParagraphItem & {
  paragraphIdx: number;
  itemIdx: number;
};
type DocumentGenerator = Generator<DocumentIteratorItem, void, undefined>;
export function* documentIterator(content: Paragraph[]): DocumentGenerator {
  let accumulatedTime = 0;
  for (let p = 0; p < content.length; p++) {
    const paragraph = content[p];
    for (let i = 0; i < paragraph.content.length; i++) {
      const item = paragraph.content[i];
      yield { paragraphIdx: p, itemIdx: i, ...item, absoluteStart: accumulatedTime };
      accumulatedTime += item.end - item.start;
    }
  }
}
export function* skipToTime(targetTime: number, iterator: DocumentGenerator): DocumentGenerator {
  let next = null;
  for (const item of iterator) {
    if (item.absoluteStart > targetTime && next) {
      yield next;
    }
    next = item;
  }
  if (next && next.absoluteStart >= targetTime) {
    yield next;
  }
}
