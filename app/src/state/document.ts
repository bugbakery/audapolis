import JSZip from 'jszip';
import { readFileSync } from 'fs';

interface TranscribedWord {
  conf: number;
  start: number;
  end: number;
  word: string;
}
export interface Document {
  audio: AudioBuffer;
  transcript: TranscribedWord[];
}
export async function deserializeDocument(path: string): Promise<Document> {
  const zipBinary = readFileSync(path);
  const zip = await JSZip.loadAsync(zipBinary);
  const ctx = new AudioContext();
  const audio = await ctx.decodeAudioData(await zip.file('audio').async('arraybuffer'));
  const transcript = JSON.parse(await zip.file('transcript.json').async('text')).result;

  return { audio, transcript };
}
