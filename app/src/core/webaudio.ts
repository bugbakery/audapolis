import { documentIterator, skipToTime, Document } from './document';

export const ctx = new AudioContext();

class Player {
  source: AudioBufferSourceNode;
  pauseListener: () => void;

  constructor() {
    this.source = ctx.createBufferSource();
    this.source.connect(ctx.destination);
    this.pauseListener = () => {};
  }

  async play(
    document: Document,
    start: number,
    progressCallback: (time: number) => void
  ): Promise<void> {
    const iterator = skipToTime(start, documentIterator(document.content));
    let first = true;
    try {
      for (const item of iterator) {
        if (item.type == 'word' || item.type == 'silence') {
          const timeInWord = first ? start - item.absoluteStart : 0;
          await this.playInternal(
            document.sources[item.source].decoded,
            item.start + timeInWord,
            item.end,
            progressCallback,
            item.absoluteStart + timeInWord
          );
        }

        first = false;
      }
    } catch (e) {
      // errors here mean, that the we are paused, this is ok
      console.log("error while playing. might mean that we are paused, which is ok:", e);
    }
  }
  playInternal(
    buffer: AudioBuffer,
    start: number,
    end: number,
    progressCallback: (time: number) => void,
    absoluteOffset: number
  ): Promise<void> {
    this.source = ctx.createBufferSource();
    this.source.connect(ctx.destination);
    this.source.buffer = buffer;
    this.source.start(0, start, end - start);
    const startTime = ctx.currentTime;

    let playing = true;
    const callback = () => {
      progressCallback(ctx.currentTime - startTime + absoluteOffset);
      if (playing) {
        requestAnimationFrame(callback);
      }
    };
    callback();

    return new Promise((resolve, reject) => {
      this.source.onended = () => {
        resolve();
        playing = false;
        progressCallback(absoluteOffset + (end - start));
      };
      this.pauseListener = () => {
        reject();
        playing = false;
      };
    });
  }
  pause() {
    this.source.stop(0);
    this.pauseListener();
  }
}
export const player = new Player();
