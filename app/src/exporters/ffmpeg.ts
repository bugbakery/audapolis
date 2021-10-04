import fs from 'fs';
import path from 'path';
import os from 'os';
import { Source, RenderItem } from '../core/document';
import { Argument } from '@tedconf/fessonia/types/lib/filter_node';
import Fessonia from '@tedconf/fessonia';
import ffmpegPath from 'ffmpeg-static';

const { FFmpegCommand, FFmpegInput, FFmpegOutput, FilterChain, FilterNode } = Fessonia({
  ffmpeg_bin: ffmpegPath,
});

async function combineParts(parts: Fessonia.FFmpegInput[], output: string): Promise<void> {
  const cmd = new FFmpegCommand({ y: undefined });
  const filters = new FilterChain([
    new FilterNode(
      'concat',
      // the typings for the FilterNode constructor are horribly wrong :(
      // TODO: fix upstream
      { n: parts.length.toString(), v: '0', a: '1' } as unknown as Argument[]
    ),
  ]);
  for (const part of parts) {
    cmd.addInput(part);
    filters.addInput(part.streamSpecifier('a'));
  }
  cmd.addFilterChain(filters);
  const outputObj = new FFmpegOutput(output);
  outputObj.addStreams(filters.streamSpecifiers);
  cmd.addOutput(outputObj);
  console.debug(
    'ffmpeg commandline: ',
    cmd.toCommand().command + ' ' + cmd.toCommand().args.join(' ')
  );
  console.debug(await cmd.execute());
}

function getTempDir(): Promise<string> {
  return new Promise(function (resolve, reject) {
    fs.mkdtemp(path.join(os.tmpdir(), 'audapolis-'), (err, directory) => {
      if (err) reject(err);
      else resolve(directory);
    });
  });
}
export async function exportContent(
  content: RenderItem[],
  sources: Record<string, Source>,
  output_path: string
): Promise<void> {
  console.log('exporting render items:', content);
  const tempdir = await getTempDir();

  const files = content.map((part, i) => {
    if ('source' in part) {
      const source = sources[part.source];
      const source_path = path.join(tempdir, `part${i}-source`);
      fs.writeFileSync(source_path, new Buffer(source.fileContents));
      return new FFmpegInput(source_path, {
        ss: part.sourceStart.toString(),
        t: part.length.toString(),
      });
    } else {
      const filters = new FilterChain([
        new FilterNode('anullsrc', {
          sample_rate: 48000,
          duration: part.length,
        } as unknown as Argument[]),
      ]);
      return new FFmpegInput(filters, {
        f: 'lavfi',
      });
    }
  });

  await combineParts(files, output_path);
  fs.rmdirSync(tempdir, { recursive: true });
}

export async function convertToWav(input_path: string): Promise<Buffer> {
  const cmd = new FFmpegCommand({ y: undefined });

  cmd.addInput(new FFmpegInput(input_path));

  const tempdir: string = await getTempDir();
  const outputFile = path.join(tempdir, 'output.wav');
  cmd.addOutput(new FFmpegOutput(outputFile));

  console.debug(await cmd.execute());

  const fileData = fs.readFileSync(outputFile);
  fs.rmdirSync(tempdir, { recursive: true });
  return fileData;
}
