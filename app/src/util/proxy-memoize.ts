// This file was vendored from proxy-memoize https://github.com/dai-shi/proxy-memoize
// It is licensed under the MIT License

/* eslint-disable */

import { createProxy, isChanged, getUntracked, trackMemo } from 'proxy-compare';
import { isDraft, original } from 'immer';

type Affected = WeakMap<object, Set<string | number | symbol>>;

const isObject = (x: unknown): x is object => typeof x === 'object' && x !== null;

const untrack = <T>(x: T, seen: Set<T>): T => {
  if (!isObject(x)) return x;
  const untrackedObj = getUntracked(x);
  if (untrackedObj !== null) {
    trackMemo(x);
    return untrackedObj;
  }
  if (!seen.has(x)) {
    seen.add(x);
    Object.entries(x).forEach(([k, v]) => {
      const vv = untrack(v, seen);
      if (!Object.is(vv, v)) x[k as keyof T] = vv;
    });
  }
  return x;
};

const touchAffected = (x: unknown, orig: unknown, affected: Affected) => {
  if (!isObject(x) || !isObject(orig)) return;
  const used = affected.get(orig);
  if (!used) return;
  used.forEach((key) => {
    touchAffected(x[key as keyof typeof x], orig[key as keyof typeof orig], affected);
  });
};

// properties
const OBJ_PROPERTY = 'o';
const RESULT_PROPERTY = 'r';
const AFFECTED_PROPERTY = 'a';

/**
 * Create a memoized function
 *
 * @example
 * import memoize from 'proxy-memoize';
 *
 * const fn = memoize(obj => ({ sum: obj.a + obj.b, diff: obj.a - obj.b }));
 */
const memoize = <Obj extends object, Result>(
  fn: (obj: Obj) => Result,
  options?: { size?: number }
): ((obj: Obj) => Result) => {
  const size = options?.size ?? 1;
  const memoList: {
    [OBJ_PROPERTY]: Obj;
    [RESULT_PROPERTY]: Result;
    [AFFECTED_PROPERTY]: Affected;
  }[] = [];
  const resultCache = new WeakMap<
    Obj,
    {
      [RESULT_PROPERTY]: Result;
      [AFFECTED_PROPERTY]: Affected;
    }
  >();
  const proxyCache = new WeakMap();
  const memoizedFn = (obj: Obj) => {
    if (isDraft(obj)) {
      const orig = original(obj);
      if (orig !== undefined) {
        obj = orig;
      }
    }
    const origObj = getUntracked(obj);
    const cacheKey = origObj || obj;
    const cache = resultCache.get(cacheKey);
    if (cache) {
      touchAffected(obj, cacheKey, cache[AFFECTED_PROPERTY]);
      return cache[RESULT_PROPERTY];
    }
    for (let i = 0; i < memoList.length; i += 1) {
      const memo = memoList[i];
      if (!isChanged(memo[OBJ_PROPERTY], obj, memo[AFFECTED_PROPERTY], new WeakMap())) {
        resultCache.set(cacheKey, {
          [RESULT_PROPERTY]: memo[RESULT_PROPERTY],
          [AFFECTED_PROPERTY]: memo[AFFECTED_PROPERTY],
        });
        touchAffected(obj, cacheKey, memo[AFFECTED_PROPERTY]);
        return memo[RESULT_PROPERTY];
      }
    }
    const affected: Affected = new WeakMap();
    const proxy = createProxy(obj, affected, proxyCache);
    const result = untrack(fn(proxy), new Set());
    if (origObj !== null) {
      touchAffected(obj, origObj, affected);
    }
    memoList.unshift({
      [OBJ_PROPERTY]: cacheKey,
      [RESULT_PROPERTY]: result,
      [AFFECTED_PROPERTY]: affected,
    });
    if (memoList.length > size) memoList.pop();
    resultCache.set(cacheKey, {
      [RESULT_PROPERTY]: result,
      [AFFECTED_PROPERTY]: affected,
    });
    return result;
  };
  return memoizedFn;
};

/**
 * This is to unwrap a proxy object and return an original object.
 * It returns null if not relevant.
 *
 * [Notes]
 * This function is for debugging purpose.
 * It's not supposed to be used in production and it's subject to change.
 *
 * @example
 * import memoize, { getUntrackedObject } from 'proxy-memoize';
 *
 * const fn = memoize(obj => {
 *   console.log(getUntrackedObject(obj));
 *   return { sum: obj.a + obj.b, diff: obj.a - obj.b };
 * });
 */
export { getUntracked as getUntrackedObject } from 'proxy-compare';

export default memoize;
