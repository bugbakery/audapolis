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
    if (renderItem && 'source' in renderItem) {
      const source = this.sources[renderItem.source];
      source.currentTime = renderItem.sourceStart;
    }
  }

  getResolution(uuid: string): { x: number; y: number } | undefined {
    const ref = this.sources[uuid];
    if (!ref) return;
    if (!ref.videoHeight || !ref.videoWidth) {
      return undefined;
    } else {
      return {
        x: ref.videoWidth,
        y: ref.videoHeight,
      };
    }
  }

  /**
   * Return the export resolution of all videos. This is just a heuristic to provide sane defaults.
   */
  getTargetResolution(): { x: number; y: number } {
    const resolutions = Object.keys(this.sources).map((uuid) => this.getResolution(uuid));
    if (resolutions.every((x) => x == undefined)) {
      return {
        x: 1280,
        y: 720,
      };
    } else {
      return {
        x: resolutions.reduce((acc, x) => Math.max(acc, x?.x || 0), 0),
        y: resolutions.reduce((acc, x) => Math.max(acc, x?.y || 0), 0),
      };
    }
  }
}

export const player = new Player();
(window as any).player = player;
