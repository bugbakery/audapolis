import { DocumentGenerator, Paragraph } from './document';
import { sleep } from '../util';

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
    time: number,
    progressCallback: (time: number) => void
  ): Promise<void> {
    this.playing = true;
    const renderItems = DocumentGenerator.fromParagraphs(paragraphs)
      .exactFrom(time)
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
}

export const player = new Player();
(window as any).player = player;
