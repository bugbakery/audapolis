export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time * 1000));
}

export function assertSome<T>(x: T | null | undefined | void): asserts x is T {
  if (x === undefined || x === null) {
    throw Error(`x is not loaded (it is '${x}')`);
  }
}

export const EPSILON = 0.00001;

export function roughEq(a?: number, b?: number): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return Math.abs(a - b) < EPSILON;
}

export function encodeGetParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map((kv) => kv.map(encodeURIComponent).join('='))
    .join('&');
}
