import * as itertools from './itertools';

function* generator() {
  yield 1;
  yield 2;
  yield 3;
}
test('filter creates new iterator', () => {
  const firstIterator = new itertools.GeneratorBox(generator());
  const secondIterator = firstIterator.filter((x) => x == 2);
  expect(firstIterator.next().value).toBe(1);
  expect(secondIterator.next().value).toBe(2);
  expect(firstIterator.next().value).toBe(3);
});
