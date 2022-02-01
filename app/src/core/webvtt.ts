import {
  escapeVttString,
  formattedTime,
  SubtitleFormat,
  VttCue,
  WebVtt,
} from '@audapolis/webvtt-writer';
import fs from 'fs';
import { DocumentItem, Paragraph, TimedItemExtension, Word } from './document';
import { macroItems } from '../state/editor/selectors';

function paragraphToCue(
  paragraph: Paragraph,
  wordTimings: boolean,
  includeSpeakerNames: boolean
): VttCue | null {
  if (paragraph.content.length == 0) {
    return null;
  }
  const firstItem = paragraph.content[0];
  const lastItem = paragraph.content[paragraph.content.length - 1];
  const itemToString = (item: Word & TimedItemExtension): string => {
    if (wordTimings) {
      return `<${formattedTime(item.absoluteStart)}><c>${escapeVttString(item.word)}</c>`;
    } else {
      return escapeVttString(item.word);
    }
  };
  const payload =
    (includeSpeakerNames && paragraph.speaker ? `<v ${escapeVttString(paragraph.speaker)}>` : '') +
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
  content: DocumentItem[],
  wordTimings: boolean,
  includeSpeakerNames: boolean,
  limitLineLength: number | null
): WebVtt {
  if (limitLineLength !== null) {
    let currentCharacterLength = 0;
    let currentSpeaker = null;
    const items: DocumentItem[] = [];
    for (const item of content) {
      if (item.type == 'paragraph_break') {
        currentCharacterLength = 0;
        currentSpeaker = item.speaker;
      }
      if (item.type == 'word') {
        if (currentCharacterLength + item.word.length > limitLineLength) {
          items.push({ type: 'paragraph_break', speaker: currentSpeaker });
          currentCharacterLength = 0;
        }
        currentCharacterLength += item.word.length;
      }

      items.push(item);
    }
    content = items;
  }

  const paragraphItems: Paragraph[] = macroItems(content).filter(
    (x): x is Paragraph & TimedItemExtension => x.type == 'paragraph'
  );

  const vtt = new WebVtt(
    'This file was generated using audapolis: https://github.com/audapolis/audapolis'
  );
  for (const paragraph of paragraphItems) {
    const cue = paragraphToCue(paragraph, wordTimings, includeSpeakerNames);
    if (cue) {
      vtt.add(cue);
    }
  }
  return vtt;
}

export async function exportWebVTT(
  content: DocumentItem[],
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
