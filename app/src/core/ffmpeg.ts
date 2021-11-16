import fs from 'fs';
import path from 'path';
import { Source, RenderItem } from './document';
import Fessonia from '@tedconf/fessonia';
import ffmpegPath from 'ffmpeg-static';
import AppDirectory from 'appdirectory';
import { player } from './player';

const { FFmpegCommand, FFmpegInput, FFmpegOutput, FilterNode, FilterChain } = Fessonia({
  ffmpeg_bin: ffmpegPath,
});

async function combineVideoParts(
  parts: { v: Fessonia.FFmpegInput; a: Fessonia.FFmpegInput }[],
  targetResolution: { x: number; y: number },
  output: string
): Promise<unknown> {
  const cmd = new FFmpegCommand({ y: undefined });
  const partSpecifiers = parts.map((p) => {
    const scale = new FilterChain([
      new FilterNode('scale', {
        width: `min(iw*${targetResolution.y}/ih\\,${targetResolution.x})`,
        height: `min(${targetResolution.y}\\,ih*${targetResolution.x}/iw)`,
      }),
      new FilterNode('pad', {
        width: targetResolution.x,
        height: targetResolution.y,
        x: `(${targetResolution.x}-iw)/2`,
        y: `(${targetResolution.y}-ih)/2`,
      }),
    ]);
    cmd.addInput(p.v);
    if (p.v != p.a) {
      cmd.addInput(p.a);
    }
    scale.addInput(p.v.streamSpecifier('v'));
    cmd.addFilterChain(scale);

    return { v: scale.streamSpecifier(), a: p.a.streamSpecifier('a') };
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
  console.debug('ffmpeg commandline: ', getFfmpegComandLine(cmd));
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
function filterSource(filter: string, options: Record<string, string | number>) {
  const filters = new FilterChain([new FilterNode(filter, options)]);
  return new FFmpegInput(filters, {
    f: 'lavfi',
  });
}
export async function exportVideo(
  content: RenderItem[],
  sources: Record<string, Source>,
  outputPath: string,
  targetResolution: { x: number; y: number }
): Promise<void> {
  const tempdir = await getTempDir();

  const files = content.map((part, i) => {
    const blackSource = filterSource('color', {
      color: 'black',
      rate: 1,
      duration: part.length,
      size: `${targetResolution.x}x${targetResolution.y}`,
    });
    if ('source' in part) {
      const source = sources[part.source];
      const source_path = path.join(tempdir, `part${i}-source`);
      fs.writeFileSync(source_path, new Buffer(source.fileContents));
      const input = new FFmpegInput(source_path, {
        ss: part.sourceStart.toString(),
        t: part.length.toString(),
      });
      if (player.getResolution(part.source)) {
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

  await combineVideoParts(files, targetResolution, outputPath);
  fs.rmdirSync(tempdir, { recursive: true });
}

async function combineAudioParts(parts: Fessonia.FFmpegInput[], output: string): Promise<unknown> {
  const cmd = new FFmpegCommand({ y: undefined });
  const concat = new FilterChain([
    new FilterNode('concat', { n: parts.length.toString(), v: '0', a: '1' }),
  ]);
  for (const part of parts) {
    cmd.addInput(part);
    concat.addInput(part.streamSpecifier('a'));
  }
  cmd.addFilterChain(concat);
  const outputObj = new FFmpegOutput(output);
  outputObj.addStream(concat.streamSpecifier());
  cmd.addOutput(outputObj);
  console.debug('ffmpeg commandline: ', getFfmpegComandLine(cmd));
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

export async function exportAudio(
  content: RenderItem[],
  sources: Record<string, Source>,
  outputPath: string
): Promise<void> {
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
      return filterSource('anullsrc', {
        duration: part.length,
      });
    }
  });

  await combineAudioParts(files, outputPath);
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

function getFfmpegComandLine(cmd: Fessonia.FFmpegCommand) {
  return (
    cmd.toCommand().command +
    ' ' +
    cmd
      .toCommand()
      .args.map((x) => `'${x}'`)
      .join(' ')
  );
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
