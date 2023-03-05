import fs, { createWriteStream } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { getHomePath, saveFile, sendLogLine } from '../../ipc/ipc_renderer';
import { isRunningInTest } from './index';
import { globSync } from 'glob';
import { app } from 'electron';

export enum LogLevel {
  Log,
  Trace,
  Debug,
  Info,
  Warn,
  Error,
  GroupCollapsed,
  GroupEnd,
}

export enum LogSource {
  MainProcess,
  RendererProcess,
}

export let logFilePath: string | null = null;
let oldLog: ((...args: any[]) => void) | null = null;

function log(file: number, source: LogSource, level: LogLevel, ...args: any[]) {
  const date = new Date().toISOString();
  const level_str = LogLevel[level];
  const source_str = LogSource[source];
  const string_args = args.map((x) => x.toString());
  const log_line = JSON.stringify({
    date,
    source: source_str,
    level: level_str,
    args: string_args,
  });
  if (oldLog !== null) oldLog(log_line);
  fs.writeSync(file, log_line + '\n');
  fs.fsyncSync(file);
}

export let logLine: ((source: LogSource, level: LogLevel, ...args: any[]) => void) | null = null;

export function initMainProcessLog(): void {
  if (isRunningInTest()) {
    return;
  }
  if (logFilePath !== null) {
    throw new Error('Thou shalt not initialize logging twice');
  }
  const log_dir = app.getPath('logs');
  if (!fs.existsSync(log_dir)) {
    fs.mkdirSync(log_dir, { recursive: true });
  }
  const now = new Date();
  for (const oldLogfile of globSync(path.join(log_dir, '*.log'))) {
    if (now.getTime() - fs.statSync(oldLogfile).mtime.getTime() > 5 * 24 * 60 * 60 * 1000) {
      fs.rmSync(oldLogfile);
    }
  }
  const fileName = now.getTime().toString() + '.log';
  logFilePath = path.join(log_dir, fileName);
  const file = fs.openSync(logFilePath, 'w');
  console.log('Init logging into', logFilePath);
  oldLog = console.log;
  console.log = (...args) => log(file, LogSource.MainProcess, LogLevel.Log, ...args);
  console.trace = (...args) => log(file, LogSource.MainProcess, LogLevel.Trace, ...args);
  console.debug = (...args) => log(file, LogSource.MainProcess, LogLevel.Debug, ...args);
  console.info = (...args) => log(file, LogSource.MainProcess, LogLevel.Info, ...args);
  console.warn = (...args) => log(file, LogSource.MainProcess, LogLevel.Warn, ...args);
  console.error = (...args) => log(file, LogSource.MainProcess, LogLevel.Error, ...args);
  logLine = (...args) => log(file, ...args);
  const oldGroupCollapsed = console.groupCollapsed;
  console.groupCollapsed = (...args) => {
    log(file, LogSource.MainProcess, LogLevel.GroupCollapsed, ...args);
    oldGroupCollapsed(...args);
  };
  const oldGroupEnd = console.groupEnd;
  console.groupEnd = (...args) => {
    log(file, LogSource.MainProcess, LogLevel.GroupEnd, ...args);
    oldGroupEnd(...args);
  };
}

export async function exportDebugLogsToDisk(file: string): Promise<void> {
  console.log('Exporting logs');
  const zip = JSZip();
  zip.file('debug.log', fs.readFileSync(file));

  const savePath = await saveFile({
    title: 'Save log as...',
    properties: ['showOverwriteConfirmation', 'createDirectory'],
    filters: [
      { name: 'Zip files', extensions: ['zip'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    defaultPath: path.join(await getHomePath(), 'debug_log.zip'),
  }).then((x) => x.filePath);
  if (!savePath) return;

  await new Promise((resolve, reject) => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(createWriteStream(savePath))
      .on('finish', resolve)
      .on('error', reject);
  });
}

type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};

function _mapLogFn(key: KeyOfType<typeof console, (...args: any[]) => void>, level: LogLevel) {
  const _oldFn: (...args: any[]) => void = console[key];
  console[key] = (...args: any[]) => {
    _oldFn(...args);
    sendLogLine(level, ...args);
  };
}
export function initRendererLog(): void {
  _mapLogFn('log', LogLevel.Log);
  _mapLogFn('trace', LogLevel.Trace);
  _mapLogFn('debug', LogLevel.Debug);
  _mapLogFn('info', LogLevel.Info);
  _mapLogFn('warn', LogLevel.Warn);
  _mapLogFn('error', LogLevel.Error);
  _mapLogFn('groupCollapsed', LogLevel.GroupCollapsed);
  _mapLogFn('groupEnd', LogLevel.GroupEnd);
}
