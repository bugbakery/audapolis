import * as itertools from './itertools';

function* generator() {
  yield 1;
  yield 2;
  yield 3;
  yield 4;
}
test('filter creates new iterator', () => {
  const firstIterator = new itertools.GeneratorBox(generator());
  const secondIterator = firstIterator.filter((x) => x == 2);
  expect(firstIterator.next().value).toBe(1);
  expect(secondIterator.next().value).toBe(2);
  expect(firstIterator.next().value).toBe(3);
});

test('dropuntil', () => {
  const iter = new itertools.GeneratorBox(generator()).dropuntil((x) => x >= 2);
  expect(iter.next().value).toBe(2);
});

test('dropwhile', () => {
  const iter = new itertools.GeneratorBox(generator()).dropwhile((x) => x < 2);
  expect(iter.next().value).toBe(2);
});

test('takeuntil', () => {
  const iter = new itertools.GeneratorBox(generator()).takeuntil((x) => x >= 2);
  expect(iter.next().value).toBe(1);
  expect(iter.next().value).toBe(undefined);
});

test('takewhile', () => {
  const iter = new itertools.GeneratorBox(generator()).takewhile((x) => x <= 2);
  expect(iter.next().value).toBe(1);
  expect(iter.next().value).toBe(2);
  expect(iter.next().value).toBe(undefined);
});

test('dropwhile takewhile combination', () => {
  const condition = (x: number) => x >= 2 && x <= 3;
  const res = new itertools.GeneratorBox(generator())
    .dropwhile((x) => !condition(x))
    .takewhile(condition)
    .collect();
  expect(res).toEqual([2, 3]);
});
