import { DocumentGenerator, RenderItem } from './document';
import { createSelector, Store } from '@reduxjs/toolkit';
import { EditorState } from '../state/editor/types';
import { setPlay, setPlayerTime } from '../state/editor/play';
import { RootState } from '../state';
import { assertSome } from '../util';

export class Player {
  sources: Record<string, HTMLVideoElement> = {};

  renderItems: RenderItem[];
  currentTime: number;
  playing: boolean;

  store: Store;

  setStore(store: Store): void {
    const playingHandler = createSelector(
      (state: EditorState) => state.playing,
      (playing) => {
        this.playing = playing;
        if (playing) {
          this.play();
        } else {
          this.pause();
        }
      }
    );
    const renderItemsHandler = createSelector(
      (state: EditorState) => state.document.content,
      (state: EditorState) => state.selection,
      (paragraphs, selection) => {
        this.pause();
        let generator = DocumentGenerator.fromParagraphs(paragraphs);
        if (selection) {
          generator = generator
            .exactFrom(selection.range.start)
            .exactUntil(selection.range.start + selection.range.length);
        }
        this.renderItems = generator.toRenderItems().collect();
        if (this.playing) this.play();
      }
    );
    const userSetTimeHandler = createSelector(
      (state: EditorState) => state.currentTimeUserSet,
      (time) => {
        this.pause();
        this.updateCurrentTime(time);
        const currentRenderItem = this.getCurrentRenderItem();

        // we need to update this even if we are not playing because the video might be shown
        if (currentRenderItem && 'source' in currentRenderItem && currentRenderItem.source) {
          const offset = this.currentTime - currentRenderItem.absoluteStart;
          const element = this.sources[currentRenderItem.source];
          element.currentTime = currentRenderItem.sourceStart + offset;
        }

        if (this.playing) this.play();
      }
    );

    store.subscribe(() => {
      const state: RootState = store.getState();
      const editorState = state.editor.present;
      if (editorState) {
        playingHandler(editorState);
        renderItemsHandler(editorState);
        userSetTimeHandler(editorState);
      }
    });
    this.store = store;
  }

  updateCurrentTime(time: number): void {
    this.currentTime = time;
    setTimeout(() => {
      this.store.dispatch(setPlayerTime(time));
    });
  }

  getCurrentRenderItem(): RenderItem | undefined {
    return this.renderItems.find(
      (item) =>
        item.absoluteStart <= this.currentTime &&
        item.absoluteStart + item.length >= this.currentTime
    );
  }

  clampCurrentTimeToRenderItemsRange(): void {
    const lastRenderItem = this.renderItems[this.renderItems.length - 1];
    if (this.currentTime < this.renderItems[0].absoluteStart) {
      this.updateCurrentTime(this.renderItems[0].absoluteStart);
    } else if (this.currentTime > lastRenderItem.absoluteStart + lastRenderItem.length) {
      this.updateCurrentTime(lastRenderItem.absoluteStart + lastRenderItem.length);
    }
  }

  play(): void {
    this.clampCurrentTimeToRenderItemsRange();

    const currentRenderItem = this.getCurrentRenderItem();
    assertSome(currentRenderItem);

    if ('source' in currentRenderItem && currentRenderItem.source) {
      const element = this.sources[currentRenderItem.source];
      const offset = this.currentTime - currentRenderItem.absoluteStart;
      element.currentTime = currentRenderItem.sourceStart + offset;
      this.playRenderItem(
        currentRenderItem,
        () => element.currentTime - currentRenderItem.sourceStart + currentRenderItem.absoluteStart,
        () => element.pause(),
        () => this.play()
      );
      element.play();
    } else {
      // we produce synthetic silence
      const startTime = Date.now();
      this.playRenderItem(
        currentRenderItem,
        () => Date.now() - startTime + currentRenderItem.absoluteStart,
        () => {},
        () => this.play()
      );
    }
  }

  playRenderItem(
    renderItem: RenderItem,
    getTime: () => number,
    onRenderItemDone: () => void,
    onNextRenderItem: () => void
  ): void {
    const lastRenderItem = this.renderItems[this.renderItems.length - 1];
    const callback = () => {
      const time = getTime();
      this.updateCurrentTime(time);
      if (!this.playing) {
        onRenderItemDone();
      } else if (this.currentTime >= lastRenderItem.absoluteStart + lastRenderItem.length) {
        onRenderItemDone();
        setTimeout(() => {
          this.store.dispatch(setPlay(false));
        });
      } else if (time >= renderItem.absoluteStart + renderItem.length) {
        onRenderItemDone();
        onNextRenderItem();
      } else {
        requestAnimationFrame(callback);
      }
    };
    callback();
  }

  pause(): void {
    Object.values(this.sources).forEach((s) => {
      s.pause();
    });
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

  getDuration(uuid: string): number | undefined {
    const ref = this.sources[uuid];
    if (!ref) return;
    return ref.duration;
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
