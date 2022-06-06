import {
  escapeVttString,
  formattedTime,
  SubtitleFormat,
  VttCue,
  WebVtt,
} from '@audapolis/webvtt-writer';
import fs from 'fs';
import {
  V3Paragraph,
  TimedItemExtension,
  V3DocumentItem,
  V3TextItem,
  UuidExtension,
} from './document';
import { memoizedMacroItems } from '../state/editor/selectors';
import { v4 as uuidv4 } from 'uuid';

function paragraphToCue(
  paragraph: V3Paragraph,
  wordTimings: boolean,
  includeSpeakerNames: boolean
): VttCue | null {
  if (paragraph.content.length == 0) {
    return null;
  }
  const firstItem = paragraph.content[0];
  const lastItem = paragraph.content[paragraph.content.length - 1];
  const itemToString = (item: V3TextItem & TimedItemExtension): string => {
    if (wordTimings) {
      return `<${formattedTime(item.absoluteStart)}><c>${escapeVttString(item.text)}</c>`;
    } else {
      return escapeVttString(item.text);
    }
  };
  const payload =
    (includeSpeakerNames && paragraph.speaker ? `<v ${escapeVttString(paragraph.speaker)}>` : '') +
    paragraph.content
      .filter(
        (item): item is V3TextItem & UuidExtension & TimedItemExtension => item.type == 'text'
      )
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
  content: V3DocumentItem[],
  wordTimings: boolean,
  includeSpeakerNames: boolean,
  limitLineLength: number | null
): WebVtt {
  if (limitLineLength !== null) {
    let currentCharacterLength = 0;
    let currentSpeaker: { speaker: string | null; language: string | null } = {
      speaker: null,
      language: null,
    };
    const items: V3DocumentItem[] = [];
    for (const item of content) {
      if (item.type == 'paragraph_start') {
        currentCharacterLength = 0;
        currentSpeaker = { speaker: item.speaker, language: item.language };
      }
      if (item.type == 'text') {
        if (currentCharacterLength + item.text.length > limitLineLength) {
          const cur_speak = currentSpeaker.speaker;
          const cur_lang = currentSpeaker.language;
          if (cur_speak === null) {
            throw new Error('Current speaker is null. Who is the speaker?');
          }
          items.push(
            { type: 'paragraph_break', uuid: uuidv4() },
            {
              type: 'paragraph_start',
              speaker: cur_speak,
              language: cur_lang,
              uuid: uuidv4(),
            }
          );
          currentCharacterLength = 0;
        }
        currentCharacterLength += item.text.length;
      }

      items.push(item);
    }
    content = items;
  }

  const paragraphItems: V3Paragraph[] = memoizedMacroItems(content).filter(
    (x): x is V3Paragraph & TimedItemExtension => x.type == 'paragraph'
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
  content: V3DocumentItem[],
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
