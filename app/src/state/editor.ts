import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ipcRenderer } from 'electron';
import { store } from './index';
import { openEditor } from './nav';
import { deserializeDocument, Document } from './document';

export interface Editor {
  path?: string;
  error?: any;
  document?: Document;
}

export const openDocument = createAsyncThunk('editor/openDocument', async (): Promise<Editor> => {
  const path = await ipcRenderer
    .invoke('open-file', {
      properties: ['openFile'],
      promptToCreate: true,
      createDirectory: true,
      filters: [
        { name: 'Audapolis Project Files', extensions: ['audapolis'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    .then((x) => x.filePaths[0]);
  let document;
  try {
    document = await deserializeDocument(path);
  } catch (error) {
    return { error };
  }
  console.log(document);
  store.dispatch(openEditor());
  return { path, document };
});

export const importSlice = createSlice({
  name: 'editor',
  initialState: {} as Editor,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(openDocument.fulfilled, (state, action) => {
      const payload = action.payload as Editor;
      for (const key in payload) {
        const k = key as keyof Editor;
        state[k] = payload[k];
      }
    });
    builder.addCase(openDocument.rejected, (state, action) => {
      console.error(action.payload);
    });
  },
});
export default importSlice.reducer;
