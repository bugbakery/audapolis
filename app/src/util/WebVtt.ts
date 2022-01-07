export type SubtitleFormat = 'vtt' | 'srt';

interface VttElement {
  toString: (format: SubtitleFormat) => string;
}

export class VttCueSettings {
  vertical?: 'rl' | 'lr';
  line?: number | string;
  size?: string;
  align?: 'start' | 'center' | 'end';

  constructor({
    vertical,
    size,
    line,
    align,
  }: {
    vertical?: 'rl' | 'lr';
    line?: number | string;
    size?: string;
    align?: 'start' | 'center' | 'end';
  }) {
    this.vertical = vertical;
    this.line = line;
    this.size = size;
    this.align = align;
  }

  toString(format: SubtitleFormat): string {
    if (format == 'srt') {
      return '';
    }
    return Object.entries(this)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');
  }
}

export function formattedTime(sec: number): string {
  const subseconds = Math.floor((sec % 1) * 1000)
    .toString()
    .padStart(3, '0');
  const seconds = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((sec / 60) % 60)
    .toString()
    .padStart(2, '0');
  const hours = Math.floor(sec / 60 / 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}.${subseconds}`;
}

export class VttCue implements VttElement {
  identifier?: string;
  startTime: number;
  endTime: number;
  settings?: VttCueSettings;
  payload: string;

  constructor({
    startTime,
    endTime,
    payload,
    payloadEscaped,
    identifier,
    identifierEscaped,
    settings,
  }: {
    startTime: number;
    endTime: number;
    payload: string;
    payloadEscaped?: boolean;
    identifier?: string;
    identifierEscaped?: boolean;
    settings?: VttCueSettings;
  }) {
    if (this.startTime >= this.endTime) {
      throw Error('Cue end time must be greater than cue start time');
    }
    this.startTime = startTime;
    this.endTime = endTime;
    if (!payloadEscaped) {
      payload = escapeVttString(payload);
    }
    this.payload = payload;
    if (identifier && !identifierEscaped) {
      identifier = escapeVttString(identifier);
    }
    this.identifier = identifier;
    this.settings = settings;
  }

  toString(format: SubtitleFormat): string {
    return (
      (this.identifier ? `${this.identifier}\n` : '') +
      `${formattedTime(this.startTime)} --> ${formattedTime(this.endTime)} ${
        this.settings?.toString(format) || ''
      }`.trim() +
      '\n' +
      this.payload
    );
  }
}

export class VttComment implements VttElement {
  commentText: string;

  constructor(text: string, escaped = false) {
    if (!escaped) {
      text = escapeVttString(text);
    }
    if (text.includes('-->')) {
      throw Error('WebVTT comments MUST NOT contain -->');
    }
    this.commentText = text;
  }

  toString(format: SubtitleFormat): string {
    if (format != 'vtt') {
      return '';
    }
    return `NOTE ${this.commentText}`;
  }
}

export function escapeVttString(text: string): string {
  const escape_map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  return text.replace(/[&<>]/, (x) => escape_map[x]);
}

class VttHeader implements VttElement {
  headerText: string;

  constructor(text: string, escaped = false) {
    if (!escaped) {
      text = escapeVttString(text);
    }
    if (text.includes('-->')) {
      throw Error('WebVTT text header MUST NOT contain -->');
    }
    if (text.includes('\n')) {
      throw Error('WebVTT text header MUST NOT contain newlines');
    }
    this.headerText = text;
  }

  toString(format: SubtitleFormat): string {
    if (format != 'vtt') {
      return '';
    }
    return `WEBVTT ${this.headerText}`;
  }
}

export class WebVtt {
  elements: VttElement[];

  constructor(header = '') {
    this.elements = [new VttHeader(header)];
  }

  add(element: VttElement): void {
    this.elements.push(element);
  }

  toString(format: SubtitleFormat = 'vtt'): string {
    return this.elements
      .map((x) => x.toString(format))
      .filter((x) => x)
      .join('\n\n');
  }
}
