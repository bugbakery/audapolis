import { roughEq } from './index';

test('roughEq works', () => {
  expect(roughEq(0.0000001, 0.000000101)).toBe(true);
  expect(roughEq(0.0000001001, 0.0000001)).toBe(true);
  expect(roughEq(0.0000001001, 0.0100001)).toBe(false);
  expect(roughEq(1)).toBe(false);
});
