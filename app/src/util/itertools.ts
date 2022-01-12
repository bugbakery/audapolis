export class GeneratorBox<T> implements Generator<T> {
  generator: Generator<T>;

  constructor(generator: Generator<T> | T[]) {
    if (Array.isArray(generator)) {
      this.generator = (function* () {
        for (const v of generator) {
          yield v;
        }
      })();
    } else {
      this.generator = generator;
    }
  }

  chain(iter: GeneratorBox<T>): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(chain(this, iter));
  }
  map<O>(mapper: (x: T) => O): GeneratorBox<O> {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(map(mapper, this));
  }
  filter(predicate: (x: T) => boolean): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(filter(predicate, this));
  }
  dropwhile(predicate: (x: T) => boolean): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(dropwhile(predicate, this));
  }
  takewhile(predicate: (x: T) => boolean): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(takewhile(predicate, this));
  }
  dropuntil(predicate: (x: T) => boolean): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(dropuntil(predicate, this));
  }
  takeuntil(predicate: (x: T) => boolean): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(takeuntil(predicate, this));
  }
  enumerate(): GeneratorBox<T & { globalIdx: number }> {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(enumerate(this));
  }
  filterMap<O>(predicate: (x: T) => O | undefined): GeneratorBox<O> {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(filterMap(predicate, this));
  }

  reduce<V>(reducer: (previousValue: V, x: T) => V, initialValue: V): V {
    let value = initialValue;
    for (const item of this) {
      value = reducer(value, item);
    }
    return value;
  }

  log(text?: string): this {
    const C = Object.getPrototypeOf(this);
    return new C.constructor(logOnUse(this, text || ''));
  }
  collect(): T[] {
    return Array.from(this);
  }
  [Symbol.iterator](): Generator<T> {
    return this.generator;
  }
  next(): IteratorResult<T> {
    return this.generator.next();
  }
  return(value: T): IteratorResult<T> {
    return this.generator.return(value);
  }

  throw(e: any): IteratorResult<T> {
    return this.generator.throw(e);
  }
}

function* chain<T>(a: Generator<T>, b: Generator<T>): Generator<T> {
  yield* a;
  yield* b;
}
export function* map<T, O>(mapper: (x: T) => O, input: Generator<T>): Generator<O> {
  for (const item of input) {
    yield mapper(item);
  }
}
function* filterMap<I, O>(
  predicate: (x: I) => O | undefined,
  iterator: Generator<I>
): Generator<O> {
  for (const item of map(predicate, iterator)) {
    if (item !== undefined) {
      yield item;
    }
  }
}

function* filter<T>(predicate: (x: T) => boolean, input: Generator<T>): Generator<T> {
  for (const item of input) {
    if (predicate(item)) {
      yield item;
    }
  }
}

function* dropwhile<T>(predicate: (x: T) => boolean, input: Generator<T>): Generator<T> {
  let dropping = true;
  for (const item of input) {
    dropping = dropping && predicate(item);
    if (!dropping) {
      yield item;
    }
  }
}

function* dropuntil<T>(predicate: (x: T) => boolean, input: Generator<T>): Generator<T> {
  let dropping = true;
  for (const item of input) {
    dropping = dropping && !predicate(item);
    if (!dropping) {
      yield item;
    }
  }
}

function* takewhile<T>(predicate: (x: T) => boolean, input: Generator<T>): Generator<T> {
  for (const item of input) {
    if (predicate(item)) {
      yield item;
    } else {
      break;
    }
  }
}

function* takeuntil<T>(predicate: (x: T) => boolean, input: Generator<T>): Generator<T> {
  for (const item of input) {
    if (!predicate(item)) {
      yield item;
    } else {
      break;
    }
  }
}

function* enumerate<T>(iterator: Generator<T>): Generator<T & { globalIdx: number }> {
  let globalIdx = 0;
  for (const item of iterator) {
    yield { ...item, globalIdx };
    globalIdx += 1;
  }
}

function* logOnUse<T>(iterator: Generator<T>, text: string): Generator<T> {
  for (const item of iterator) {
    console.log(text, item);
    yield item;
  }
}
