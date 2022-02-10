import { store } from '../state';

export declare global {
  interface Window {
    store: typeof store;
  }
}
