import { RenderItem, Source } from './document';
import path from 'path';
import fs from 'fs';
import { assertSome, encodeGetParams } from '../util';
import { player } from './player';
import { getAuthHeader, getServerName, ServerConfig } from '../state/server';

/**
 * helpers for export to opentimelineIO with the help of the python backend.
 */

interface Segment {
  speaker: string;
  source_file: string;
  source_length: number;
  has_video: boolean;
  source_start: number;
  length: number;
}

export async function exportOtio(
  name: string,
  extention: string,
  adapter: string,
  content: RenderItem[],
  sources: Record<string, Source>,
  outputPath: string,
  server: ServerConfig
): Promise<void> {
  fs.rmdirSync(outputPath, { recursive: true });
  fs.mkdirSync(outputPath);
  fs.mkdirSync(path.join(outputPath, 'media'));

  const timeline: Segment[] = content.map((x) => {
    if (!('speaker' in x)) {
      console.debug(x);
      throw Error('not implemented');
    }
    console.log(x.speaker);
    const hasVideo = !!player.getResolution(x.source);
    const duration = player.getDuration(x.source);
    assertSome(duration);
    return {
      speaker: x.speaker,
      source_file: `media/${x.source}`,
      source_length: duration,
      has_video: hasVideo,

      source_start: x.sourceStart,
      length: x.length,
    };
  });

  console.log(timeline);

  const otioOutput = await fetch(
    `${getServerName(server)}/util/otio/convert?` +
      encodeGetParams({
        name,
        adapter,
      }),
    {
      method: 'POST',
      body: JSON.stringify(timeline),
      headers: {
        Authorization: getAuthHeader(server),
        'content-type': 'application/json',
      },
    }
  ).then((x) => x.arrayBuffer());

  for (const name of Object.keys(sources)) {
    console.log(Object.keys(sources), name, sources[name]);
    const source_path = path.join(outputPath, 'media', name);
    fs.writeFileSync(source_path, new Buffer(sources[name].fileContents));
  }
  fs.writeFileSync(path.join(outputPath, `${name}.${extention}`), new Buffer(otioOutput));
}
