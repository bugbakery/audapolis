import JSZip from 'jszip';
import { readFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import { memoizedParagraphItems } from '../state/editor/selectors';

/**
 * The file versions of audapolis are not the same as the actual release versions of the app.
 * They should be changed any time a breaking update to the file structure happens but it is not necessary to bump them
 * when a new audapolis version is released.
 */

// V0
type DocumentPreV1Json = V1Paragraph[];

// V1
interface DocumentV1Json {
  version: 1;
  content: V1Paragraph[];
}

export type V1ParagraphItem = Word | Silence | ArtificialSilence;

export interface V1Paragraph<I = V1ParagraphItem> {
  speaker: string;
  content: I[];
}
export type TimedV1ParagraphItem = V1ParagraphItem & { absoluteStart: number };

// V2
interface DocumentV2Json {
  version: 2;
  content: DocumentItem[];
}

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

type MacroItem = Paragraph;
export type UntimedMacroItem = Paragraph<DocumentItem>;
export type TimedMacroItem = MacroItem & TimedItemExtension;
export type TimedParagraphItem = ParagraphItem & TimedItemExtension;
export interface Paragraph<I = TimedParagraphItem> {
  type: 'paragraph';
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

export type ParagraphItem = Word | Silence | ArtificialSilence;
export type DocumentItem = ParagraphItem | ParagraphBreakItem;

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

// V3
interface DocumentV3Json {
  version: 3;
}
export type DocumentJson = DocumentV3Json | DocumentV2Json | DocumentV1Json | DocumentPreV1Json;

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
  let content: DocumentItem[];
  if (!('version' in parsed)) {
    throw new Error(
      'Unversioned audapolis files are not supported anymore.\nProbably your audapolis file is corrupt.'
    );
  } else if (parsed.version == 1) {
    content = [];
    for (const paragraph of parsed.content) {
      content.push({ type: 'paragraph_break', speaker: paragraph.speaker }, ...paragraph.content);
    }
  } else if (parsed.version == 2) {
    content = parsed.content;
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

    for (const v of memoizedParagraphItems(content)) {
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
    memoizedParagraphItems(document.content)
      .map((v) => ('source' in v ? v.source : undefined))
      .filter((x) => x !== undefined)
  );

  Object.entries(document.sources)
    .filter(([hash, _]) => neededSources.has(hash))
    .map(([k, source]) => {
      zip.file(`sources/${k}`, source.fileContents);
    });

  const encodedDocument: DocumentV2Json = { version: 2, content: document.content };
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
