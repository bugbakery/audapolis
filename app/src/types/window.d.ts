import { store } from '../state';
import { Page } from 'puppeteer-core';
import { Player } from '../core/player';

export declare global {
  interface Window {
    store: typeof store;
    player: Player;
    reducers: Record<string, any>;
  }

  // this is actually only true in puppeteer tests but I don't know how to apply types only to these files
  export const page: Page;
}
