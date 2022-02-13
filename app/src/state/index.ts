import { configureStore } from '@reduxjs/toolkit';
import { player } from '../core/player';

import nav from './nav';
import transcribe from './transcribe';
import editor from './editor';
import models from './models';
import server from './server';

export const store = configureStore({
  reducer: {
    nav,
    transcribe,
    editor,
    models,
    server,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

window.store = store;
player.setStore(store);

export type RootState = ReturnType<typeof store.getState>;
