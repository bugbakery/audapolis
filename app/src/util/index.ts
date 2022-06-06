import path from 'path';

export function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time * 1000));
}

// *** START: Things to please the almighty typescript gods
export function assertSome<T>(x: T | null | undefined | void): asserts x is T {
  if (x === undefined || x === null) {
    throw Error(`x is '${x}' while it is asserted that it is some`);
  }
}

export function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}
// *** END: Things to please the almighty typescript gods

/**
 * One of the worse hack in audapolis: If the difference between two numbers is less than EPSILON,
 * we consider them to be the same.
 */
export const EPSILON = 0.00001;

export function roughEq(a?: number, b?: number): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return Math.abs(a - b) < EPSILON;
}

export function switchExtension(pathName: string, extension: string): string {
  const current_extension = path.extname(pathName);
  const dirname = path.dirname(pathName);
  let basename = path.basename(pathName, current_extension);
  if (path.extname(basename) != extension) {
    basename += extension;
  }
  return path.join(dirname, basename);
}

export function isRunningInTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
