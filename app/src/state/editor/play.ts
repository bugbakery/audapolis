import { assertSome } from '../../util';
import { player } from '../../core/player';
import { DocumentGenerator, getItemsAtTime } from '../../core/document';
import { createActionWithReducer, createAsyncActionWithReducer } from '../util';
import { EditorState } from './types';

export const setTimeInternal = createActionWithReducer<EditorState, number>(
  'editor/setTime',
  (state, newTime) => {
    state.currentTime = newTime;
  }
);
export const setTime = createAsyncActionWithReducer<EditorState, number>(
  'editor/setTimeWithPlay',
  async (newTime, { getState, dispatch }): Promise<void> => {
    const editor = getState().editor.present;
    assertSome(editor);
    const playing = editor.playing;
    if (playing) {
      await dispatch(pause());
    }
    dispatch(setTimeInternal(newTime));
    if (playing) {
      dispatch(play());
    }
  }
);

export const play = createAsyncActionWithReducer<EditorState>(
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
      editor.selection?.range || { start: currentTime },
      progressCallback
    );
    console.log('play ended');
    dispatch(setPlay(false));
  }
);
export const pause = createAsyncActionWithReducer<EditorState>(
  'editor/pause',
  async (): Promise<void> => {
    player.pause();
  }
);
export const togglePlaying = createAsyncActionWithReducer<EditorState>(
  'editor/togglePlaying',
  async (arg, { dispatch, getState }): Promise<void> => {
    if (getState().editor.present?.playing) {
      dispatch(pause());
    } else {
      dispatch(play());
    }
  }
);

export const setPlay = createActionWithReducer<EditorState, boolean>(
  'editor/setPlay',
  (state, payload) => {
    state.playing = payload;
  }
);

export const setTimeWithoutUpdate = createActionWithReducer<EditorState, number>(
  'editor/setTimeWithoutUpdate',
  (state, payload) => {
    state.currentTime = payload;
  }
);
export const goLeft = createActionWithReducer<EditorState>('editor/goLeft', (state) => {
  assertSome(state);
  const item = getItemsAtTime(
    DocumentGenerator.fromParagraphs(state.document.content),
    state.currentTime
  )[0];
  assertSome(item);
  state.currentTime = item.absoluteStart;
  player.setTime(state.document.content, state.currentTime);
  state.selection = null;
});

export const goRight = createActionWithReducer<EditorState>('editor/goRight', (state) => {
  assertSome(state);
  const items = getItemsAtTime(
    DocumentGenerator.fromParagraphs(state.document.content),
    state.currentTime
  );
  const item = items[items.length - 1];
  state.currentTime = item.absoluteStart + item.length;
  player.setTime(state.document.content, state.currentTime);
  state.selection = null;
});
