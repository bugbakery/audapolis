import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ipcRenderer, clipboard } from 'electron';
import { RootState } from './index';
import { openEditor, openLanding } from './nav';
import {
  deserializeDocument,
  deserializeDocumentFromFile,
  Document,
  DocumentGenerator,
  DocumentGeneratorItem,
  getCurrentItem,
  serializeDocument,
  serializeDocumentToFile,
  TimedParagraphItem,
  Word,
} from '../core/document';
import undoable, { includeAction } from 'redux-undo';
import { assertSome, EPSILON } from '../util';
import * as ffmpeg_exporter from '../exporters/ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { player } from '../core/player';

export interface Editor {
  path: string | null;
  document: Document;
  lastSavedDocument: Document | null;
  exportState: ExportState;

  currentTime: number;
  playing: boolean;
  displaySpeakerNames: boolean;
  displayVideo: boolean;

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
  displayVideo: false,

  selection: null,
  selectionStartItem: null,
  mouseSelection: false,
};

export interface Range {
  start: number;
  length: number;
}

class NoFileSelectedError extends Error {
  constructor() {
    super();
    this.name = 'NoFileSelectedError';
  }
}

export const openDocumentFromDisk = createAsyncThunk(
  'editor/openDocumentFromDisk',
  async (_, { dispatch }): Promise<void> => {
    const file = await ipcRenderer.invoke('open-file', {
      title: 'Open audapolis document...',
      properties: ['openFile'],
      promptToCreate: true,
      createDirectory: true,
      filters: [
        { name: 'Audapolis Project Files', extensions: ['audapolis'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (file.canceled) {
      throw new NoFileSelectedError();
    }
    const path = file.filePaths[0];

    dispatch(openEditor());
    try {
      const document = await deserializeDocumentFromFile(path, (noSourceDocument) => {
        dispatch(
          setState({
            path,
            document: noSourceDocument,
            ...editorDefaults,
            lastSavedDocument: noSourceDocument,
          })
        );
      });
      await dispatch(
        setState({
          path,
          document,
          ...editorDefaults,
          lastSavedDocument: document,
        })
      );
    } catch (e) {
      dispatch(openLanding());
      throw e;
    }
  }
);

export const openDocumentFromMemory = createAsyncThunk<void, Document>(
  'editor/openDocumentFromMemory',
  async (document, { dispatch }) => {
    await dispatch(openEditor());
    await dispatch(
      setState({
        path: null,
        document,
        ...editorDefaults,
      })
    );
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
    const progressCallback = (time: number) => dispatch(setTimeWithoutUpdate(time));
    await player.play(
      document.content,
      editor.selection || { start: currentTime },
      progressCallback
    );
    console.log('play ended');
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

export const saveDocument = createAsyncThunk<Document, boolean, { state: RootState }>(
  'editor/saveDocument',
  async (saveAsNew, { dispatch, getState }) => {
    const document = getState().editor.present?.document;
    if (document === undefined) {
      throw Error('cant save. document is undefined');
    }
    const state_path = getState().editor.present?.path;
    if (state_path && !saveAsNew) {
      await serializeDocumentToFile(document, state_path);
    } else {
      console.log('opening save dialog');
      const path = await ipcRenderer
        .invoke('save-file', {
          title: 'Save file as...',
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
    const path = await ipcRenderer
      .invoke('save-file', {
        title: 'Export file',
        properties: ['saveFile'],
        filters: [
          { name: 'mp3 Files', extensions: ['mp3'] },
          { name: 'wav Files', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      .then((x) => x.filePath);
    console.log('saving to ', path);

    const renderItems = DocumentGenerator.fromParagraphs(document.content)
      .toRenderItems()
      .collect();
    console.log(renderItems);
    await ffmpeg_exporter.exportContent(renderItems, document.sources, path);

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
        dispatch(deleteParagraphBreak());
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

    const documentSlice = DocumentGenerator.fromParagraphs(state.document.content)
      .exactFrom(selection.start)
      .exactUntil(selection.start + selection.length)
      .toParagraphs();

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

    console.log('copying', selectionText);

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

export const cut = createAsyncThunk<void, void, { state: RootState }>(
  'editor/copy',
  async (arg, { dispatch }) => {
    await dispatch(copy());
    await dispatch(deleteSelection());
  }
);

export const paste = createAsyncThunk<Document, void, { state: RootState }>(
  'editor/paste',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    if (!clipboard.has('x-audapolis/document-zip')) {
      throw new Error('cannot paste clipboard contents');
    }
    const buffer = clipboard.readBuffer('x-audapolis/document-zip');
    // TODO: Don't extract sources from zip we already have in our file
    const deserialized = await deserializeDocument(buffer);
    console.log('deserialized', deserialized);
    return deserialized;
  }
);

export const exportSelection = createAsyncThunk<void, void, { state: RootState }>(
  'editor/exportSelection',
  async (arg, { getState }) => {
    const state = getState().editor.present;
    assertSome(state);

    const selection = state.selection;
    if (!selection) {
      return;
    }

    const filterFn = (item: DocumentGeneratorItem) =>
      item.absoluteStart >= selection.start &&
      item.absoluteStart + item.length <= selection.start + selection.length;
    const render_items = DocumentGenerator.fromParagraphs(state.document.content)
      .filter(filterFn)
      .toRenderItems()
      .collect();

    const path = await ipcRenderer
      .invoke('save-file', {
        title: 'Export selection',
        properties: ['saveFile'],
        filters: [
          { name: 'mp3 Files', extensions: ['mp3'] },
          { name: 'wav Files', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      .then((x) => x.filePath);
    console.log('exporting to', path);
    await ffmpeg_exporter.exportContent(render_items, state.document.sources, path);
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
      currentEndRight: startDifference < EPSILON,
      currentEndLeft: endDifference < EPSILON,
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
    setState(state, arg: PayloadAction<Editor>) {
      return arg.payload;
    },

    setPlay: (state, args: PayloadAction<boolean>) => {
      assertSome(state);
      state.playing = args.payload;
    },
    toggleDisplaySpeakerNames: (state) => {
      assertSome(state);
      state.displaySpeakerNames = !state.displaySpeakerNames;
    },
    toggleDisplayVideo: (state) => {
      assertSome(state);
      state.displayVideo = !state.displayVideo;
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
      player.setTime(state.document.content, state.currentTime);
    },
    setTimeWithoutUpdate: (state, args: PayloadAction<number>) => {
      assertSome(state);
      state.currentTime = args.payload;
    },
    goLeft: (state) => {
      assertSome(state);
      const item = getCurrentItem(state.document.content, state.currentTime, true);
      assertSome(item);
      state.currentTime = item.absoluteStart;
      player.setTime(state.document.content, state.currentTime);
      state.selection = null;
    },
    goRight: (state) => {
      assertSome(state);
      const iter = DocumentGenerator.fromParagraphs(state.document.content).skipToTime(
        state.currentTime,
        true
      );
      iter.next();
      const item = iter.next().value;
      assertSome(item);
      state.currentTime = item.absoluteStart;
      player.setTime(state.document.content, state.currentTime);
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
    selectItem: (state, arg: PayloadAction<TimedParagraphItem>) => {
      assertSome(state);
      const item = arg.payload;
      state.selection = { start: item.absoluteStart, length: item.length };
    },
    selectParagraph: (state, arg: PayloadAction<TimedParagraphItem>) => {
      assertSome(state);
      const item = arg.payload;
      const findParagraph = (
        [found, paraUuid, pStart, pLength]: [boolean, string | null, number, number],
        x: DocumentGeneratorItem
      ): [boolean, string | null, number, number] => {
        if (found) {
          if (paraUuid == x.paragraphUuid) {
            pLength = pLength + x.length;
          }
        } else {
          if (paraUuid != x.paragraphUuid) {
            pStart = x.absoluteStart;
            pLength = x.length;
            paraUuid = x.paragraphUuid;
          } else {
            pLength += x.length;
          }
          if (x.absoluteStart >= item.absoluteStart) {
            found = true;
          }
        }
        return [found, paraUuid, pStart, pLength];
      };
      const [found, _p, paraStart, paraLength] = DocumentGenerator.fromParagraphs(
        state.document.content
      ).reduce(findParagraph, [false, null, 0, 0]);
      if (found) {
        state.selection = { start: paraStart, length: paraLength + EPSILON };
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

    insertParagraphBreak: (state) => {
      assertSome(state);

      const newUuid = uuidv4();
      let prevUuid = '';
      const splitParagraphs = (item: DocumentGeneratorItem): DocumentGeneratorItem => {
        if (item.paragraphUuid == prevUuid && item.absoluteStart >= state.currentTime) {
          item.paragraphUuid = newUuid;
        } else if (item.absoluteStart < state.currentTime) {
          prevUuid = item.paragraphUuid;
        }
        return item;
      };

      state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
        .itemMap(splitParagraphs)
        .toParagraphs();
    },
    deleteParagraphBreak: (state) => {
      assertSome(state);

      let parUuid: string | null = null;
      let prevUuid = '';
      const mergeParagraphs = (item: DocumentGeneratorItem): DocumentGeneratorItem => {
        if (item.absoluteStart < state.currentTime) {
          prevUuid = item.paragraphUuid;
        } else if (parUuid === null || item.paragraphUuid === parUuid) {
          parUuid = item.paragraphUuid;
          item.paragraphUuid = prevUuid;
        }
        return item;
      };
      state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
        .itemMap(mergeParagraphs)
        .toParagraphs();
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
      state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
        .filter(isNotSelected)
        .toParagraphs();
      state.currentTime = selection.start;
      state.selection = null;
    },

    setWord: (state, arg: PayloadAction<{ absoluteStart: number; text: string }>) => {
      console.log(state, arg.payload);
      assertSome(state);
      state.document.content = DocumentGenerator.fromParagraphs(state.document.content)
        .itemMap((item) =>
          item.absoluteStart == arg.payload.absoluteStart && item.type == 'word'
            ? { ...item, word: arg.payload.text }
            : item
        )
        .toParagraphs();
    },
    reassignParagraph: (
      state,
      payload: PayloadAction<{ paragraphIdx: number; newSpeaker: string }>
    ) => {
      assertSome(state);
      const { paragraphIdx, newSpeaker } = payload.payload;

      state.document.content = state.document.content.map((paragraph, i) => {
        if (i === paragraphIdx) {
          return { ...paragraph, speaker: newSpeaker };
        } else {
          return paragraph;
        }
      });
    },
    renameSpeaker: (state, payload: PayloadAction<{ oldName: string; newName: string }>) => {
      assertSome(state);
      const { oldName, newName } = payload.payload;

      state.document.content = state.document.content.map((paragraph) => {
        if (paragraph.speaker === oldName) {
          return { ...paragraph, speaker: newName };
        } else {
          return paragraph;
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(openDocumentFromDisk.rejected, (state, action) => {
      if (action.error.name == 'NoFileSelectedError') return;
      console.error(`an error occurred while trying to open the file`, action.error);
      alert(`an error occurred while trying to open the file:\n${action.error.message}`);
    });
    builder.addCase(openDocumentFromMemory.rejected, (state, action) => {
      console.error(
        'an error occurred while trying to load the document from memory',
        action.error
      );
      alert(`an error occurred while trying to open the file:\n${action.error.message}`);
    });
    builder.addCase(play.rejected, (state, action) => {
      console.error('an error occurred during playback', action.error);
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
      alert(`Failed to Export:\n${action.error.name}: ${action.error.message}`);
    });
    builder.addCase(paste.rejected, (state, action) => {
      console.error('paste rejected:', action.payload);
    });
    builder.addCase(paste.fulfilled, (state, action) => {
      assertSome(state);
      state.document.sources = { ...state.document.sources, ...action.payload.sources };
      const beforeSlice = DocumentGenerator.fromParagraphs(state.document.content).filter(
        (item) => item.absoluteStart + item.length <= state.currentTime
      );
      const pastedSlice = DocumentGenerator.fromParagraphs(action.payload.content);
      const afterSlice = DocumentGenerator.fromParagraphs(state.document.content).filter(
        (item) => item.absoluteStart + item.length > state.currentTime
      );

      const combinedDocument = beforeSlice.chain(pastedSlice).chain(afterSlice).toParagraphs();
      state.document.content = combinedDocument;
    });
  },
});
export const {
  toggleDisplaySpeakerNames,
  toggleDisplayVideo,
  setPlay,
  setPath,
  setTime,
  setTimeWithoutUpdate,

  goLeft,
  goRight,

  unselect,
  selectLeft,
  selectRight,
  mouseSelectionStart,
  mouseSelectionOver,
  mouseSelectionEnd,

  selectItem,
  selectParagraph,

  insertParagraphBreak,
  deleteParagraphBreak,
  deleteSelection,

  setWord,
  reassignParagraph,
  renameSpeaker,
} = importSlice.actions;
const { setState } = importSlice.actions;
export default undoable(importSlice.reducer, {
  filter: includeAction([
    insertParagraphBreak.type,
    deleteParagraphBreak.type,
    deleteSelection.type,
    reassignParagraph.type,
    renameSpeaker.type,
  ]),
  ignoreInitialState: false,
});
