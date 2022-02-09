import { RenderItem, Source } from './document';
import path from 'path';
import fs from 'fs';
import { assertSome } from '../util';
import { player } from './player';
import { ServerConfig } from '../state/server';
import { convertOtio, OtioSegment } from '../server_api/api';

/**
 * helpers for export to opentimelineIO with the help of the python backend.
 */

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

  const timeline: OtioSegment[] = content.map((x) => {
    if (!('speaker' in x)) {
      console.debug(x);
      throw Error('not implemented');
    }
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

  const otioOutput = await convertOtio(server, name, adapter, timeline);

  for (const name of Object.keys(sources)) {
    const source_path = path.join(outputPath, 'media', name);
    fs.writeFileSync(source_path, new Buffer(sources[name].fileContents));
  }
  fs.writeFileSync(path.join(outputPath, `${name}.${extention}`), new Buffer(otioOutput));
}
