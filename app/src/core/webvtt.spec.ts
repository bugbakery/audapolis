import tmp from 'tmp';
import { contentToVtt, exportWebVTT } from './webvtt';
import { V3DocumentItem } from './document';
import fs from 'fs';
import { addUuids } from '../util/test_helper';

const testContent: V3DocumentItem[] = addUuids([
  { type: 'paragraph_start', speaker: 'Speaker One', language: 'en' },
  { type: 'text', text: 'One', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'text', text: 'Two', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'text', text: 'Three', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'text', text: 'Four', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'paragraph_break' },
  { type: 'paragraph_start', speaker: 'Speaker Two', language: 'en' },
  { type: 'text', text: 'Two One', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'text', text: 'Two Two', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'text', text: 'Two Three', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'text', text: 'Two Four', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
  { type: 'paragraph_break' },
]);

test('webvtt: export minimal', () => {
  const vtt = contentToVtt(testContent, false, false, null);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:04.000\nOne Two Three Four\n\n' +
      '00:00:04.000 --> 00:00:08.000\nTwo One Two Two Two Three Two Four'
  );
});

test('webvtt: line length', () => {
  const vtt = contentToVtt(testContent, false, false, 10);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:02.000\nOne Two\n\n' +
      '00:00:02.000 --> 00:00:04.000\nThree Four\n\n' +
      '00:00:04.000 --> 00:00:05.000\nTwo One\n\n' +
      '00:00:05.000 --> 00:00:06.000\nTwo Two\n\n' +
      '00:00:06.000 --> 00:00:07.000\nTwo Three\n\n' +
      '00:00:07.000 --> 00:00:08.000\nTwo Four'
  );
});

test('webvtt: line length: too long word', () => {
  const testContent: V3DocumentItem[] = addUuids([
    { type: 'paragraph_start', speaker: 'Speaker One', language: 'en' },
    { type: 'text', text: 'One', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
    { type: 'text', text: 'Two', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
    {
      type: 'text',
      text: 'Supercalifragilisticexpialidocious',
      source: 'source-1',
      sourceStart: 1,
      conf: 1,
      length: 1,
    },
    { type: 'text', text: 'Four', source: 'source-1', sourceStart: 1, conf: 1, length: 1 },
    { type: 'paragraph_break' },
  ]);
  const vtt = contentToVtt(testContent, false, false, 10);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:02.000\nOne Two\n\n' +
      '00:00:02.000 --> 00:00:03.000\nSupercalifragilisticexpialidocious\n\n' +
      '00:00:03.000 --> 00:00:04.000\nFour'
  );
});

test('webvtt: empty para creates no cue', () => {
  const testContent: V3DocumentItem[] = addUuids([
    { type: 'paragraph_start', speaker: 'Speaker One', language: 'en' },
    { type: 'paragraph_break' },
  ]);
  const vtt = contentToVtt(testContent, false, false, 10);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis'
  );
});

test('webvtt: empty document creates no cue', () => {
  const testContent: V3DocumentItem[] = [];
  const vtt = contentToVtt(testContent, false, false, 10);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis'
  );
});

test('webvtt: speaker names', () => {
  const vtt = contentToVtt(testContent, false, true, null);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:04.000\n<v Speaker One>One Two Three Four\n\n' +
      '00:00:04.000 --> 00:00:08.000\n<v Speaker Two>Two One Two Two Two Three Two Four'
  );
});

test('webvtt: word timings', () => {
  const vtt = contentToVtt(testContent, true, false, null);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:04.000\n<00:00:00.000><c>One</c> <00:00:01.000><c>Two</c> <00:00:02.000><c>Three</c> <00:00:03.000><c>Four</c>\n\n' +
      '00:00:04.000 --> 00:00:08.000\n<00:00:04.000><c>Two One</c> <00:00:05.000><c>Two Two</c> <00:00:06.000><c>Two Three</c> <00:00:07.000><c>Two Four</c>'
  );
});

test('webvtt: speaker names and word timings', () => {
  const vtt = contentToVtt(testContent, true, true, null);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:04.000\n<v Speaker One><00:00:00.000><c>One</c> <00:00:01.000><c>Two</c> <00:00:02.000><c>Three</c> <00:00:03.000><c>Four</c>\n\n' +
      '00:00:04.000 --> 00:00:08.000\n<v Speaker Two><00:00:04.000><c>Two One</c> <00:00:05.000><c>Two Two</c> <00:00:06.000><c>Two Three</c> <00:00:07.000><c>Two Four</c>'
  );
});

test('webvtt: speaker names, word timings and line limit', () => {
  const vtt = contentToVtt(testContent, true, true, 20);
  expect(vtt.toString()).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:04.000\n<v Speaker One><00:00:00.000><c>One</c> <00:00:01.000><c>Two</c> <00:00:02.000><c>Three</c> <00:00:03.000><c>Four</c>\n\n' +
      '00:00:04.000 --> 00:00:06.000\n<v Speaker Two><00:00:04.000><c>Two One</c> <00:00:05.000><c>Two Two</c>\n\n' +
      '00:00:06.000 --> 00:00:08.000\n<v Speaker Two><00:00:06.000><c>Two Three</c> <00:00:07.000><c>Two Four</c>'
  );
});

test('webvtt: speaker names, word timings and line limit', async () => {
  const tmpobj = tmp.fileSync();
  await exportWebVTT(testContent, tmpobj.name, true, true, 20, 'vtt');
  const vtt = fs.readFileSync(tmpobj.name, 'utf-8');
  expect(vtt).toBe(
    'WEBVTT This file was generated using audapolis: https://github.com/audapolis/audapolis\n\n' +
      '00:00:00.000 --> 00:00:04.000\n<v Speaker One><00:00:00.000><c>One</c> <00:00:01.000><c>Two</c> <00:00:02.000><c>Three</c> <00:00:03.000><c>Four</c>\n\n' +
      '00:00:04.000 --> 00:00:06.000\n<v Speaker Two><00:00:04.000><c>Two One</c> <00:00:05.000><c>Two Two</c>\n\n' +
      '00:00:06.000 --> 00:00:08.000\n<v Speaker Two><00:00:06.000><c>Two Three</c> <00:00:07.000><c>Two Four</c>'
  );
});
