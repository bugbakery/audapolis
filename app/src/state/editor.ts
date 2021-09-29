import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer, clipboard } from 'electron';
import { RootState } from './index';
import { openEditor } from './nav';
import {
  deserializeDocument,
  Document,
  documentFromIterator,
  documentIterator,
  DocumentIteratorItem,
  filterItems,
  getCurrentItem,
  renderItemsFromDocument,
  serializeDocument,
  serializeDocumentToFile,
  skipToTime,
  TimedParagraphItem,
  Word,
} from '../core/document';
import { player } from '../core/webaudio';
import undoable, { includeAction } from 'redux-undo';
import { assertSome } from '../util';
import * as ffmpeg_exporter from '../exporters/ffmpeg';

export interface Editor {
  path: string | null;
  document: Document;
  lastSavedDocument: Document | null;
  exportState: ExportState;

  currentTime: number;
  playing: boolean;
  displaySpeakerNames: boolean;

  selection: Range | null;
  selectionStartItem: TimedParagraphItem | null;
  mouseSelection: boolean;
}

export enum ExportState {
  NotRunning,
  Running,
}

const editorDefaults = {
  lastSavedDocument: null,
  exportState: ExportState.NotRunning,

  currentTime: 0,
  playing: false,
  displaySpeakerNames: false,

  selection: null,
  selectionStartItem: null,
  mouseSelection: false,
};

export interface Range {
  start: number;
  length: number;
}

export const openDocumentFromDisk = createAsyncThunk(
  'editor/openDocumentFromDisk',
  async (_, { dispatch }): Promise<Editor> => {
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
    const document = await deserializeDocument(path);

    dispatch(openEditor());
    return {
      path,
      document,
      ...editorDefaults,
      lastSavedDocument: document,
    };
  }
);

export const openDocumentFromMemory = createAsyncThunk<Editor, Document>(
  'editor/openDocumentFromMemory',
  async (document, { dispatch }): Promise<Editor> => {
    dispatch(openEditor());
    return {
      path: null,
      document,
      ...editorDefaults,
    };
  }
);

export const play = createAsyncThunk<void, void, { state: RootState }>(
  'editor/play',
  async (arg, { getState, dispatch }): Promise<void> => {
    const editor = getState().editor.present;
    assertSome(editor);
    if (editor.playing) {
      return;
    }
    dispatch(setPlay(true));
    const { document, currentTime } = editor;
    const progressCallback = (time: number) => dispatch(setTime(time));
    await player.play(document, currentTime, progressCallback);
    dispatch(setPlay(false));
  }
);
export const pause = createAsyncThunk<void, void, { state: RootState }>(
  'editor/pause',
  async (): Promise<void> => {
    player.pause();
  }
);
export const togglePlaying = createAsyncThunk<void, void, { state: RootState }>(
  'editor/togglePlaying',
  async (arg, { dispatch, getState }): Promise<void> => {
    if (getState().editor.present?.playing) {
      dispatch(pause());
    } else {
      dispatch(play());
    }
  }
);

export const saveDocument = createAsyncThunk<Document, void, { state: RootState }>(
  'editor/saveDocument',
  async (_, { dispatch, getState }) => {
    const document = getState().editor.present?.document;
    if (document === undefined) {
      throw Error('cant save. document is undefined');
    }
    const state_path = getState().editor.present?.path;
    if (state_path) {
      await serializeDocumentToFile(document, state_path);
    } else {
      console.log('opening save dialog');
      const path = await ipcRenderer
        .invoke('save-file', {
          properties: ['saveFile'],
          filters: [
            { name: 'Audapolis Project Files', extensions: ['audapolis'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        .then((x) => x.filePath);
      console.log('saving to ', path);
      dispatch(setPath(path));
      await serializeDocumentToFile(document, path);
    }
    return document;
  }
);

export const exportDocument = createAsyncThunk<Document, void, { state: RootState }>(
  'editor/exportDocument',
  async (_, { getState }) => {
    const document = getState().editor.present?.document;
    if (document === undefined) {
      throw Error('cant export. document is undefined');
    }
    console.log('starting export', document.content);
    const render_items = renderItemsFromDocument(document);
    const path = await ipcRenderer
      .invoke('save-file', {
        properties: ['saveFile'],
        filters: [
          { name: 'mp3 Files', extensions: ['mp3'] },
          { name: 'wav Files', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      .then((x) => x.filePath);
    console.log('saving to ', path);
    await ffmpeg_exporter.exportContent(render_items, document.sources, path);
    return document;
  }
);

export const deleteSomething = createAsyncThunk<void, void, { state: RootState }>(
  'editor/delete',
  async (arg, { getState, dispatch }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (state.selection !== null) {
      dispatch(deleteSelection());
    } else {
      const item = getCurrentItem(state.document.content, state.currentTime);
      if (item?.itemIdx == 0) {
        dispatch(deleteParagraph());
      } else {
        dispatch(selectLeft());
      }
    }
  }
);

export const copy = createAsyncThunk<void, void, { state: RootState }>(
  'editor/copy',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    const selection = state.selection;
    if (!selection) {
      return;
    }

    const filter = (item: DocumentIteratorItem) =>
      item.absoluteStart >= selection.start &&
      item.absoluteStart + item.length <= selection.start + selection.length;
    const documentSlice = documentFromIterator(
      filterItems(filter, documentIterator(state.document.content))
    );

    const selectionText = documentSlice
      .map((paragraph) => {
        let paragraphText = '';
        if (state.displaySpeakerNames) {
          paragraphText += `${paragraph.speaker}:\t`;
        }
        paragraphText += paragraph.content
          .filter((x) => x.type == 'word')
          .map((x) => (x as Word).word)
          .join(' ');
        return paragraphText;
      })
      .join('\n\n');

    const serializedSlice = await serializeDocument({
      content: documentSlice,
      sources: state.document.sources,
    }).generateAsync({
      type: 'nodebuffer',
      streamFiles: true,
    });
    clipboard.writeBuffer('x-audapolis/document-zip', serializedSlice);
  }
);

function getSelectionInfo(
  selection: Range | null,
  selectionStartItem: TimedParagraphItem | null
): { currentEndRight: boolean; currentEndLeft: boolean; leftEnd: number; rightEnd: number } | null {
  if (selection && selectionStartItem) {
    const startDifference = Math.abs(selectionStartItem.absoluteStart - selection.start);
    const selectionStartItemEnd = selectionStartItem.absoluteStart + selectionStartItem.length;
    const selectionEnd = selection.start + selection.length;
    const endDifference = Math.abs(selectionStartItemEnd - selectionEnd);
    return {
      leftEnd: selection.start,
      rightEnd: selection.start + selection.length,
      currentEndRight: startDifference < 0.01,
      currentEndLeft: endDifference < 0.01,
    };
  } else if (selectionStartItem) {
    const selectionStartItemEnd = selectionStartItem.absoluteStart + selectionStartItem.length;
    return {
      leftEnd: selectionStartItem.absoluteStart,
      rightEnd: selectionStartItemEnd,
      currentEndRight: false,
      currentEndLeft: false,
    };
  } else {
    return null;
  }
}

export const importSlice = createSlice({
  name: 'editor',
  initialState: null as Editor | null,
  reducers: {
    setPlay: (state, args: PayloadAction<boolean>) => {
      assertSome(state);
      state.playing = args.payload;
    },
    toggleDisplaySpeakerNames: (state) => {
      assertSome(state);
      state.displaySpeakerNames = !state.displaySpeakerNames;
    },
    setPath: (state, args: PayloadAction<string>) => {
      assertSome(state);
      state.path = args.payload;
    },
    setExportState(state, args: PayloadAction<ExportState>) {
      assertSome(state);
      state.exportState = args.payload;
    },

    setTime: (state, args: PayloadAction<number>) => {
      assertSome(state);
      state.currentTime = args.payload;
    },
    goLeft: (state) => {
      assertSome(state);
      const item = getCurrentItem(state.document.content, state.currentTime, true);
      assertSome(item);
      state.currentTime = item.absoluteStart;
      state.selection = null;
    },
    goRight: (state) => {
      assertSome(state);
      const iter = skipToTime(state.currentTime, documentIterator(state.document.content), true);
      iter.next();
      const item = iter.next().value;
      assertSome(item);
      state.currentTime = item.absoluteStart;
      state.selection = null;
    },

    unselect: (state) => {
      assertSome(state);
      state.selection = null;
      state.selectionStartItem = null;
      state.mouseSelection = false;
    },
    selectLeft: (state) => {
      assertSome(state);
      const selectionInfo = getSelectionInfo(state.selection, state.selectionStartItem);
      if (!selectionInfo || !state.selection) {
        const item = getCurrentItem(state.document.content, state.currentTime, true);
        assertSome(item);
        state.selection = { start: item.absoluteStart, length: item.length };
        state.selectionStartItem = item;
      } else {
        const { leftEnd, rightEnd, currentEndLeft } = selectionInfo;
        if (currentEndLeft) {
          const item = getCurrentItem(state.document.content, leftEnd, true);
          assertSome(item);
          state.selection.length = rightEnd - item.absoluteStart;
          state.selection.start = item.absoluteStart;
        } else {
          const item = getCurrentItem(state.document.content, rightEnd, true);
          assertSome(item);
          state.selection.length = item.absoluteStart - leftEnd;
        }
      }
    },
    selectRight: (state) => {
      assertSome(state);
      const selectionInfo = getSelectionInfo(state.selection, state.selectionStartItem);
      if (!selectionInfo || !state.selection) {
        const item = getCurrentItem(state.document.content, state.currentTime, false);
        assertSome(item);
        state.selection = { start: item.absoluteStart, length: item.length };
        state.selectionStartItem = item;
      } else {
        const { leftEnd, rightEnd, currentEndRight } = selectionInfo;
        if (currentEndRight) {
          const item = getCurrentItem(state.document.content, rightEnd);
          assertSome(item);
          const itemEnd = item.absoluteStart + item.length;
          state.selection.length = itemEnd - leftEnd;
        } else {
          const item = getCurrentItem(state.document.content, leftEnd);
          assertSome(item);
          const itemEnd = item.absoluteStart + item.length;
          state.selection.length = rightEnd - itemEnd;
          state.selection.start = itemEnd;
        }
      }
    },
    mouseSelectionStart: (state, arg: PayloadAction<TimedParagraphItem>) => {
      assertSome(state);
      state.mouseSelection = true;
      state.selectionStartItem = arg.payload;
      state.selection = null;
    },
    mouseSelectionOver: (state, arg: PayloadAction<TimedParagraphItem>) => {
      assertSome(state);
      if (!state.selectionStartItem || !state.mouseSelection) return;

      const list = [state.selectionStartItem, arg.payload];
      list.sort((a, b) => a.absoluteStart - b.absoluteStart);
      const [first, second] = list;
      state.selection = {
        start: first.absoluteStart,
        length: second.absoluteStart + second.length - first.absoluteStart,
      };
    },
    mouseSelectionEnd: (state) => {
      assertSome(state);
      state.mouseSelection = false;
    },

    insertParagraph: (state) => {
      assertSome(state);

      const item = skipToTime(
        state.currentTime,
        documentIterator(state.document.content),
        true
      ).next().value;
      assertSome(item);

      const oldParagraph = state.document.content[item.paragraphIdx];
      const wordsBefore = oldParagraph.content.slice(0, item.itemIdx);
      const wordsAfter = oldParagraph.content.slice(item.itemIdx);

      state.document.content = [
        ...state.document.content.slice(0, item.paragraphIdx),
        { ...oldParagraph, content: wordsBefore },
        { ...oldParagraph, content: wordsAfter },
        ...state.document.content.slice(item.paragraphIdx + 1),
      ];
    },
    deleteParagraph: (state) => {
      assertSome(state);
      const item = getCurrentItem(state.document.content, state.currentTime);
      assertSome(item);
      const prevParagraph = state.document.content[item.paragraphIdx - 1];
      const thisParagraph = state.document.content[item.paragraphIdx];

      if (thisParagraph?.speaker !== prevParagraph?.speaker) {
        throw Error('can only merge paragraphs if speaker is the same');
      }

      state.document.content = [
        ...state.document.content.slice(0, item.paragraphIdx - 1),
        { ...thisParagraph, content: [...prevParagraph.content, ...thisParagraph.content] },
        ...state.document.content.slice(item.paragraphIdx + 1),
      ];
    },
    deleteSelection: (state) => {
      assertSome(state);
      const selection = state.selection;
      if (!selection) {
        throw new Error('selection is null');
      }
      const isNotSelected = (item: TimedParagraphItem) => {
        return !(
          item.absoluteStart >= selection.start &&
          item.absoluteStart + item.length <= selection.start + selection.length
        );
      };
      state.document.content = documentFromIterator(
        filterItems(isNotSelected, documentIterator(state.document.content))
      );
      state.currentTime = selection.start;
      state.selection = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openDocumentFromDisk.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocumentFromDisk.rejected, (state, action) => {
      console.error('an error occurred while trying to load the file', action.error);
    });
    builder.addCase(openDocumentFromMemory.fulfilled, (state, action) => {
      return action.payload;
    });
    builder.addCase(openDocumentFromMemory.rejected, (state, action) => {
      console.error('an error occurred while trying to load the doc from memory', action.error);
    });
    builder.addCase(pause.fulfilled, (state) => {
      assertSome(state);
      state.playing = false;
    });
    builder.addCase(saveDocument.fulfilled, (state, action) => {
      assertSome(state);
      state.lastSavedDocument = action.payload;
    });
    builder.addCase(exportDocument.pending, (state) => {
      assertSome(state);
      state.exportState = ExportState.Running;
    });
    builder.addCase(exportDocument.fulfilled, (state) => {
      assertSome(state);
      state.exportState = ExportState.NotRunning;
    });
    builder.addCase(exportDocument.rejected, (state, action) => {
      assertSome(state);
      state.exportState = ExportState.NotRunning;
      console.error('an error occurred while trying to export the file', action.error);
      alert('Failed to Export');
    });
  },
});
export const {
  toggleDisplaySpeakerNames,
  setPlay,
  setPath,
  setTime,

  goLeft,
  goRight,

  unselect,
  selectLeft,
  selectRight,
  mouseSelectionStart,
  mouseSelectionOver,
  mouseSelectionEnd,

  insertParagraph,
  deleteParagraph,
  deleteSelection,
} = importSlice.actions;
export default undoable(importSlice.reducer, {
  filter: includeAction([insertParagraph.type, deleteParagraph.type, deleteSelection.type]),
});
