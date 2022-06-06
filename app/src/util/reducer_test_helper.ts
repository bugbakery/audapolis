import { AsyncThunkAction } from '@reduxjs/toolkit/dist/createAsyncThunk';
import { EditorState } from '../state/editor/types';
import { AnyAction } from '@reduxjs/toolkit';
import { reducers } from '../state/editor';
import _ from 'lodash';

/**
 * Calls an async thunk and handles oll the side effects in the same Promise.
 * Awaiting the returned promise ensures all properly awaited side effects are done.
 * @param thunk the thunk to test
 * @param state the current state. this will likely be mutated.
 */
export async function runAsyncThunkSync(
  thunk: AsyncThunkAction<any, any, any>,
  state: EditorState
): Promise<void> {
  const dispatch = async (action: AnyAction | AsyncThunkAction<any, any, any>) => {
    if (typeof action == 'function') {
      await runAsyncThunkSync(action, state);
    } else {
      reducers.forEach((reducer) => {
        reducer.handleAction(state, action);
      });
    }
  };

  const getState = () => ({ editor: { present: _.cloneDeep(state) } });
  const returned = await thunk(dispatch, getState, {});
  dispatch(returned);
}
