import { Paragraph, DocumentGenerator, TimedParagraphItem } from './document';
import { escapeVttString, formattedTime, VttCue, WebVtt } from '../util/WebVtt';
import fs from 'fs';

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
export async function exportWebVTT(
  content: Paragraph[],
  outputPath: string,
  wordTimings: boolean,
  includeSpeakerNames: boolean
): Promise<void> {
  const vtt = new WebVtt(
    'This file was automatically generated using audapolis: https://github.com/audapolis/audapolis'
  );
  const timedParagraphs = DocumentGenerator.fromParagraphs(content).toTimedParagraphs();
  for (const paragraph of timedParagraphs) {
    const cue = paragraphToCue(paragraph, wordTimings, includeSpeakerNames);
    if (cue) {
      vtt.add(cue);
    }
  }
  const vttString = vtt.toString();
  console.log(vttString);
  fs.writeFileSync(outputPath, vttString);
}
