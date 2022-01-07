import { Paragraph, DocumentGenerator, TimedParagraphItem } from './document';
import {
  escapeVttString,
  formattedTime,
  SubtitleFormat,
  VttCue,
  WebVtt,
} from '@audapolis/webvtt-writer';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function paragraphToCue(
  paragraph: Paragraph<TimedParagraphItem>,
  wordTimings: boolean,
  includeSpeakerNames: boolean
): VttCue | null {
  if (paragraph.content.length == 0) {
    return null;
  }
  const firstItem = paragraph.content[0];
  const lastItem = paragraph.content[paragraph.content.length - 1];
  const itemToString = (item: TimedParagraphItem & { type: 'word' }): string => {
    if (wordTimings) {
      return `<${formattedTime(item.absoluteStart)}><c>${escapeVttString(item.word)}</c>`;
    } else {
      return escapeVttString(item.word);
    }
  };
  const payload =
    (includeSpeakerNames ? `<v ${escapeVttString(paragraph.speaker)}>` : '') +
    paragraph.content
      .filter((item) => item.type == 'word')
      .map(itemToString)
      .join(' ');
  return new VttCue({
    startTime: firstItem.absoluteStart,
    endTime: lastItem.absoluteStart + lastItem.length,
    payload,
    payloadEscaped: true,
  });
}

export function contentToVtt(
  content: Paragraph[],
  wordTimings: boolean,
  includeSpeakerNames: boolean,
  limitLineLength: number | null
): WebVtt {
  const vtt = new WebVtt(
    'This file was automatically generated using audapolis: https://github.com/audapolis/audapolis'
  );
  let docGenerator = DocumentGenerator.fromParagraphs(content);
  if (limitLineLength !== null) {
    let lastUuid = '';
    let currentCharacterLength = 0;
    let currentUuid = '';
    docGenerator = docGenerator.itemMap((item) => {
      if (lastUuid != item.paragraphUuid) {
        lastUuid = item.paragraphUuid;
        currentCharacterLength = item.type == 'word' ? item.word.length + 1 : 0;
        currentUuid = item.paragraphUuid;
        return item;
      }
      if (item.type != 'word') {
        return { ...item, paragraphUuid: currentUuid };
      }
      if (currentCharacterLength + item.word.length > limitLineLength) {
        currentUuid = uuidv4();
        currentCharacterLength = item.word.length;
      }
      currentCharacterLength += 1 + item.word.length;
      return { ...item, paragraphUuid: currentUuid };
    });
  }
  const timedParagraphs = docGenerator.toTimedParagraphs();
  for (const paragraph of timedParagraphs) {
    const cue = paragraphToCue(paragraph, wordTimings, includeSpeakerNames);
    if (cue) {
      vtt.add(cue);
    }
  }
  return vtt;
}

export async function exportWebVTT(
  content: Paragraph[],
  outputPath: string,
  wordTimings: boolean,
  includeSpeakerNames: boolean,
  limitLineLength: number | null,
  format: SubtitleFormat
): Promise<void> {
  const vttString = contentToVtt(
    content,
    wordTimings,
    includeSpeakerNames,
    limitLineLength
  ).toString(format);
  fs.writeFileSync(outputPath, vttString);
}
