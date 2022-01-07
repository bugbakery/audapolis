// export class VttCueSettings {
//   vertical?: 'rl' | 'lr';
//   line?: number | string;
//   size?: string;
//   align?: 'start' | 'center' | 'end';
//
//   toString() {
//     return Object.entries(this).map((k, v) => `${k}:${v}`).join(' ')
//   }
// }
import { VttComment, VttCue, VttCueSettings, WebVtt } from './WebVtt';

test('empty cue settings produce empty string', () => {
  const settings = new VttCueSettings({});
  expect(settings.toString('vtt')).toBe('');
});

test('partially filled cue settings produce correct string', () => {
  let settings = new VttCueSettings({ vertical: 'lr' });
  expect(settings.toString('vtt')).toBe('vertical:lr');

  settings = new VttCueSettings({ vertical: 'lr' });
  expect(settings.toString('vtt')).toBe('vertical:lr');
});

test('updating the cue settings object', () => {
  const settings = new VttCueSettings({ vertical: 'lr' });
  expect(settings.toString('vtt')).toBe('vertical:lr');
  settings.vertical = 'rl';
  settings.size = '10';
  expect(settings.toString('vtt')).toBe('vertical:rl size:10');
});

test('generating a valid webvtt', () => {
  const vtt = new WebVtt('- Translation of that film I like');
  vtt.add(
    new VttComment(
      'This translation was done by Kyle so that\nsome friends can watch it with their parents.'
    )
  );
  vtt.add(
    new VttCue({
      startTime: 135,
      endTime: 150,
      payload: '- Ta en kopp >varmt te.\n- Det är inte varmt.',
      identifier: '1',
    })
  );
  vtt.add(
    new VttCue({
      startTime: 165,
      endTime: 180,
      payload: '- Har en kopp te.\n- Det smakar som te.',
      identifier: '2',
    })
  );
  vtt.add(new VttComment('This last line may not translate well.'));
  vtt.add(new VttCue({ startTime: 185, endTime: 210, payload: '- Ta en kopp', identifier: '3' }));

  expect(vtt.toString()).toBe(
    'WEBVTT - Translation of that film I like\n' +
      '\n' +
      'NOTE This translation was done by Kyle so that\n' +
      'some friends can watch it with their parents.\n' +
      '\n' +
      '1\n' +
      '00:02:15.000 --> 00:02:30.000\n' +
      '- Ta en kopp &gt;varmt te.\n' +
      '- Det är inte varmt.\n' +
      '\n' +
      '2\n' +
      '00:02:45.000 --> 00:03:00.000\n' +
      '- Har en kopp te.\n' +
      '- Det smakar som te.\n' +
      '\n' +
      'NOTE This last line may not translate well.\n' +
      '\n' +
      '3\n' +
      '00:03:05.000 --> 00:03:30.000\n' +
      '- Ta en kopp'
  );
});

test('generating a valid srt', () => {
  const vtt = new WebVtt('- Translation of that film I like');
  vtt.add(
    new VttComment(
      'This translation was done by Kyle so that\nsome friends can watch it with their parents.'
    )
  );
  vtt.add(
    new VttCue({
      startTime: 135,
      endTime: 150,
      payload: '- Ta en kopp >varmt te.\n- Det är inte varmt.',
      identifier: '1',
    })
  );
  vtt.add(
    new VttCue({
      startTime: 165,
      endTime: 180,
      payload: '- Har en kopp te.\n- Det smakar som te.',
      identifier: '2',
    })
  );
  vtt.add(new VttComment('This last line may not translate well.'));
  vtt.add(new VttCue({ startTime: 185, endTime: 210, payload: '- Ta en kopp', identifier: '3' }));

  expect(vtt.toString('srt')).toBe(
    '1\n' +
      '00:02:15.000 --> 00:02:30.000\n' +
      '- Ta en kopp &gt;varmt te.\n' +
      '- Det är inte varmt.\n' +
      '\n' +
      '2\n' +
      '00:02:45.000 --> 00:03:00.000\n' +
      '- Har en kopp te.\n' +
      '- Det smakar som te.\n' +
      '\n' +
      '3\n' +
      '00:03:05.000 --> 00:03:30.000\n' +
      '- Ta en kopp'
  );
});
