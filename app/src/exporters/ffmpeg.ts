import fs from 'fs';
import path from 'path';
import { Source, RenderItem } from '../core/document';
import Fessonia from '@tedconf/fessonia';
import ffmpegPath from 'ffmpeg-static';
import { player } from '../core/player';
import AppDirectory from 'appdirectory';

const { FFmpegCommand, FFmpegInput, FFmpegOutput, FilterNode, FilterChain } = Fessonia({
  ffmpeg_bin: ffmpegPath,
});

async function combineParts(
  parts: { v: Fessonia.FFmpegInput; a: Fessonia.FFmpegInput }[],
  output: string
): Promise<unknown> {
  console.debug('combineParts');
  const cmd = new FFmpegCommand({ y: undefined });
  const partSpecifiers = parts.map((p) => {
    const scale2ref = new FilterChain([new FilterNode('scale2ref')]);
    cmd.addInput(p.v);
    if (p.v != p.a) {
      cmd.addInput(p.a);
    }
    scale2ref.addInput(p.v.streamSpecifier('v'));
    scale2ref.addInput(parts[0].v.streamSpecifier('v'));
    cmd.addFilterChain(scale2ref);

    const setsar = new FilterChain([new FilterNode('setsar', { sar: '1/1' })]);
    setsar.addInput(scale2ref.streamSpecifier());
    cmd.addFilterChain(setsar);

    const nullsink = new FilterChain([new FilterNode('nullsink')]);
    nullsink.addInput(scale2ref.streamSpecifier());
    cmd.addFilterChain(nullsink);

    return { v: setsar.streamSpecifier(), a: p.a.streamSpecifier('a') };
  });
  const concat = new FilterChain([
    new FilterNode('concat', { n: parts.length.toString(), v: '1', a: '1' }),
  ]);
  for (const part of partSpecifiers) {
    concat.addInput(part.v);
    concat.addInput(part.a);
  }
  cmd.addFilterChain(concat);
  const outputObj = new FFmpegOutput(output);
  outputObj.addStream(concat.streamSpecifier());
  outputObj.addStream(concat.streamSpecifier());
  outputObj.addOptions({ vsync: 'vfr' });
  cmd.addOutput(outputObj);
  console.debug(
    'ffmpeg commandline: ',
    cmd.toCommand().command +
      ' ' +
      cmd
        .toCommand()
        .args.map((x) => `'${x}'`)
        .join(' ')
  );
  cmd.on('update', (data) => {
    console.debug(`Received update on ffmpeg process:`, data);
  });
  const promise = new Promise((resolve, reject) => {
    cmd.on('success', resolve);
    cmd.on('error', reject);
  });
  cmd.spawn(true);
  return promise;
}

function getTempDir(): Promise<string> {
  return new Promise(function (resolve, reject) {
    const cacheDir = new AppDirectory({
      appName: 'audapolis',
    }).userCache();
    fs.mkdtemp(cacheDir, (err, directory) => {
      if (err) reject(err);
      else resolve(directory);
    });
  });
}
function filterSource(filter: string, options: Record<string, string | number>) {
  const filters = new FilterChain([new FilterNode(filter, options)]);
  return new FFmpegInput(filters, {
    f: 'lavfi',
  });
}
export async function exportContent(
  content: RenderItem[],
  sources: Record<string, Source>,
  output_path: string
): Promise<void> {
  console.log('exporting render items:', content);
  const tempdir = await getTempDir();
  console.log('tempdir:', tempdir);

  const files = content.map((part, i) => {
    const blackSource = filterSource('color', {
      color: 'black',
      rate: 1,
      duration: part.length,
    });
    if ('source' in part) {
      const source = sources[part.source];
      const source_path = path.join(tempdir, `part${i}-source`);
      fs.writeFileSync(source_path, new Buffer(source.fileContents));
      const input = new FFmpegInput(source_path, {
        ss: part.sourceStart.toString(),
        t: part.length.toString(),
      });
      if (player.hasVideo(part.source)) {
        return { v: input, a: input };
      } else {
        return { v: blackSource, a: input };
      }
    } else {
      const silenceSource = filterSource('anullsrc', {
        duration: part.length,
      });
      return { v: blackSource, a: silenceSource };
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
