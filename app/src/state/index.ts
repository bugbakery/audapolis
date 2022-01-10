import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
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
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

(window as any).store = store;

export type RootState = ReturnType<typeof store.getState>;
