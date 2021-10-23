import { DocumentGenerator, Paragraph } from './document';
import { sleep } from '../util';

export interface MaybeRange {
  start: number;
  length?: number;
}

class Player {
  sources: Record<string, HTMLVideoElement> = {};
  playing = false;

  pause(): void {
    this.playing = false;
    Object.values(this.sources).forEach((source) => {
      source.pause();
    });
  }

  async play(
    paragraphs: Paragraph[],
    range: MaybeRange,
    progressCallback: (time: number) => void
  ): Promise<void> {
    this.playing = true;
    const renderItems = DocumentGenerator.fromParagraphs(paragraphs)
      .exactFrom(range.start)
      .exactUntil(range.length ? range.start + range.length : Number.MAX_VALUE)
      .toRenderItems();
    for (const renderItem of renderItems) {
      if (!this.playing) {
        return;
      }

      const progress = async () => {
        const startTime = new Date().getTime();
        const progressInner = () => {
          const elapsed = (new Date().getTime() - startTime) / 1000;
          if (elapsed < renderItem.length && this.playing) {
            progressCallback(renderItem.absoluteStart + elapsed);
            requestAnimationFrame(progressInner);
          }
        };
        progressInner();
        await sleep(renderItem.length);
      };

      if ('source' in renderItem) {
        const source = this.sources[renderItem.source];
        source.currentTime = renderItem.sourceStart;
        await source.play();
        await progress();
        await source.pause();
      } else {
        await progress();
      }
    }
  }

  setTime(paragraphs: Paragraph[], time: number): void {
    const renderItem = DocumentGenerator.fromParagraphs(paragraphs)
      .exactFrom(time)
      .toRenderItems()
      .next().value;
    if ('source' in renderItem) {
      const source = this.sources[renderItem.source];
      source.currentTime = renderItem.sourceStart;
    }
  }

  hasVideo(uuid: string): boolean | undefined {
    const ref = this.sources[uuid];
    if (!ref) return;
    return !!(ref.videoHeight && ref.videoWidth);
  }
}

export const player = new Player();
(window as any).player = player;
