import { Draft } from 'immer';
import { AsyncThunk, createAsyncThunk } from '@reduxjs/toolkit';
import { AsyncThunkPayloadCreator } from '@reduxjs/toolkit/dist/createAsyncThunk';
import { RootState } from './index';

type ReducerType<StateSlice, Payload = void> = (state: Draft<StateSlice>, payload: Payload) => void;

type PayloadActionCreator<Payload> = (payload: Payload) => { type: string; payload: Payload };
export type ActionWithReducers<StateSlice, Payload> = PayloadActionCreator<Payload> & {
  reducer: ReducerType<StateSlice, Payload>;
  type: string;
};
export type AsyncActionWithReducers<StateSlice, Returned, ThunkArg> = AsyncThunk<
  Returned,
  ThunkArg,
  Record<string, never>
> & {
  reducers: { [x: string]: ReducerType<StateSlice, Returned | Error | void> };
};

/**
 * this function creates a special type that creates an action when called (it is an action creator) but can also be
 * collected for its reducer. this enables some nicer syntax and reduces boilerplate.
 *
 * @param type the string uniquely identifying the action
 * @param reducer the reducer associated with this action
 */
export function createActionWithReducer<StateSlice, Payload = void>(
  type: string,
  reducer: ReducerType<StateSlice, Payload>
): ActionWithReducers<StateSlice, Payload> {
  const actionCreator: PayloadActionCreator<Payload> = (payload) => ({ type, payload });
  return Object.assign(actionCreator, { reducer, type });
}

/**
 * this function works analogous to the way the `createActionReducerPair` function works. the difference is that this
 * function also gets an async thunk function as a argument, so it behaves like an async thunk. the
 * `thunk.rejected`, `thunk.fulfilled`, and `thunk.pending` actions can be handled in the reducer object and are thus
 * called after the thunk code.
 * Beware: Even if you theoretically can dispatch other actions and get the full state in your thunk code, this is a
 * potential foot-gun as you could violate atomicity guarantees in a non-obvious way.
 *
 * @param type the string uniquely identifying the action
 * @param payloadCreator the async function creating the action
 * @param reducer the reducer associated with this action
 */
export function createAsyncActionWithReducer<StateSlice, ThunkArg = void, Returned = void>(
  type: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, { state: RootState }>,
  reducer?: {
    pending?: ReducerType<StateSlice>;
    rejected?: (state: Draft<StateSlice>, error: Error) => void;
    fulfilled?: ReducerType<StateSlice, Returned>;
  }
): AsyncActionWithReducers<StateSlice, Returned, ThunkArg> {
  const thunk = createAsyncThunk<Returned, ThunkArg>(type, payloadCreator);
  const reducers: { [x: string]: ReducerType<StateSlice, Returned | Error | void> } = {};

  if (reducer?.pending) reducers[thunk.pending.type] = reducer.pending;
  if (reducer?.rejected) reducers[thunk.rejected.type] = reducer.rejected;
  if (reducer?.fulfilled) reducers[thunk.fulfilled.type] = reducer.fulfilled;

  return Object.assign(thunk, { reducers });
}
