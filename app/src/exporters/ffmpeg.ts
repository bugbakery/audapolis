import ffmpeg from 'fluent-ffmpeg/lib/fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Source, RenderItem } from '../core/document';

function encodePartAsMp3(source_path: string, part: RenderItem, output: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    const command = ffmpeg({ logger: console });
    command.input(source_path);
    command.seekInput(part.start);
    command.duration(part.end - part.start);
    command.outputFormat('wav');
    command.on('start', function (commandLine: string) {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    });
    command.on('end', function () {
      resolve(output);
    });
    command.on('error', function () {
      reject();
    });
    command.save(output);
  });
}
function combineParts(parts: string[], output: string, tmpdir: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    const command = ffmpeg({ logger: console });
    for (const part of parts) {
      command.input(part);
    }

    command.on('start', function (commandLine: string) {
      console.log('running ffmpeg: ' + commandLine);
    });
    command.on('end', function () {
      resolve(output);
    });
    command.on('error', function () {
      reject();
    });
    command.mergeToFile(output, tmpdir);
  });
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
  sources: Source[],
  output_path: string
): Promise<void> {
  const files = [];
  const tempdir: string = await getTempDir();
  for (const part of content) {
    const idx = content.indexOf(part);
    console.log('Rendering output part', idx);
    const source = sources[part.source];
    const source_path = path.join(tempdir, `part${idx}-source`);
    if (!fs.existsSync(source_path)) {
      fs.writeFileSync(source_path, new Buffer(source.fileContents));
    }
    const output = path.join(tempdir, `part${idx}`);
    await encodePartAsMp3(source_path, part, output);
    files.push(output);
  }
  console.log('Combining temp files: ', files);
  await combineParts(files, output_path, tempdir);
  fs.rmdirSync(tempdir, { recursive: true });
}
