import { defaultEditorState, EditorState } from '../state/editor/types';
import _ from 'lodash';
import memoize from './proxy-memoize';
import { produce } from 'immer';

function newCountingFunction(): [{ current: number }, () => void] {
  const counter = { current: 0 };

  function countingFunction() {
    counter.current += 1;
  }
  return [counter, countingFunction];
}

test('counter counts', () => {
  const [counter, countingFn] = newCountingFunction();
  countingFn();
  expect(counter.current).toBe(1);
  countingFn();
  expect(counter.current).toBe(2);
});

test('no state change => no reeval', () => {
  const [counter, countingFn] = newCountingFunction();
  const memoizedTime = memoize((state: EditorState) => {
    console.log(state.cursor.playerTime);
    countingFn();
  });
  const state = _.cloneDeep(defaultEditorState);
  state.cursor.playerTime = 1;
  expect(counter.current).toBe(0);
  memoizedTime(state);
  expect(counter.current).toBe(1);
  memoizedTime(state);
  expect(counter.current).toBe(1);
});

// DO NOT TO THIS
// We need to use immerjs for state changes so proxy-memoize picks up on them
// This test is to document proxy-memoize's behaviour, so we notice if they change it
test('immerless state change => no reeval', () => {
  const [counter, countingFn] = newCountingFunction();
  const memoizedTime = memoize((state: EditorState) => {
    console.log(state.cursor.playerTime);
    countingFn();
  });
  const state = _.cloneDeep(defaultEditorState);
  state.cursor.playerTime = 1;
  expect(counter.current).toBe(0);
  memoizedTime(state);
  expect(counter.current).toBe(1);
  state.cursor.playerTime = 2;
  memoizedTime(state);
  expect(counter.current).toBe(1);
});

test('unrelated state change => no reeval', () => {
  const [counter, countingFn] = newCountingFunction();
  const memoizedTime = memoize((state: EditorState) => {
    console.log(state.cursor.playerTime);
    countingFn();
  });
  const state = _.cloneDeep(defaultEditorState);
  state.cursor.playerTime = 1;
  expect(counter.current).toBe(0);
  memoizedTime(state);
  expect(counter.current).toBe(1);
  state.cursor.current = 'user';
  memoizedTime(state);
  expect(counter.current).toBe(1);
});

test('immer: state change =>  reeval', () => {
  const [counter, countingFn] = newCountingFunction();
  const memoizedTime = memoize((state: EditorState) => {
    console.log(state.cursor.playerTime);
    countingFn();
  });
  let state = _.cloneDeep(defaultEditorState);
  state.cursor.playerTime = 1;
  expect(counter.current).toBe(0);
  memoizedTime(state);
  expect(counter.current).toBe(1);
  state = produce(state, (state) => {
    state.cursor.playerTime = 2;
  });
  memoizedTime(state);
  expect(counter.current).toBe(2);
});

test('immer: unrelated state change => no reeval', () => {
  const [counter, countingFn] = newCountingFunction();
  const memoizedTime = memoize((state: EditorState) => {
    console.log(state.cursor.playerTime);
    countingFn();
  });
  let state = _.cloneDeep(defaultEditorState);
  state.cursor.playerTime = 1;
  expect(counter.current).toBe(0);
  memoizedTime(state);
  expect(counter.current).toBe(1);
  state = produce(state, (state) => {
    state.cursor.current = 'user';
  });
  memoizedTime(state);
  expect(counter.current).toBe(1);
});
