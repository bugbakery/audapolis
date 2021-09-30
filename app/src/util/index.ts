export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function assertSome<T>(x: T | null | undefined | void): asserts x is T {
  if (x === undefined || x === null) {
    throw Error(`x is not loaded (it is '${x}')`);
  }
}

export const EPSILON = 0.00001;
