import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import nav from './nav';
import transcribe from './transcribe';
import editor from './editor';

export const store = configureStore({
  reducer: {
    nav: nav,
    transcribe: transcribe,
    editor: editor,
  },
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});
(window as any).store = store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
