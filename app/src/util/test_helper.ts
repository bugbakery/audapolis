import { V3DocumentItem, V3TimedDocumentItem, Document } from '../core/document';
import { lintDocumentContent } from './document_linter';

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type V3DocumentItemWithoutUuid = DistributiveOmit<V3DocumentItem, 'uuid'>;
export type V3TimedDocumentItemWithoutUuid = DistributiveOmit<V3TimedDocumentItem, 'uuid'>;

export function addUuids(items: V3DocumentItemWithoutUuid[]): V3DocumentItem[] {
  return items.map((x, i) => ({ ...x, uuid: i.toString() }));
}
export function removeUuids(
  items: (V3DocumentItem | V3TimedDocumentItem)[]
): (V3DocumentItemWithoutUuid | V3TimedDocumentItemWithoutUuid)[] {
  return items.map(({ uuid: _uuid, ...x }) => x);
}

expect.extend({
  toStrictEqualExceptUuids(
    received: (V3DocumentItem | V3TimedDocumentItem)[],
    expected: (
      | V3DocumentItemWithoutUuid
      | V3TimedDocumentItemWithoutUuid
      | V3DocumentItem
      | V3TimedDocumentItem
    )[]
  ): jest.CustomMatcherResult {
    const received_without_uuids = removeUuids(received);
    if (expected.length > 0 && 'uuid' in expected[0]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expected = removeUuids(expected);
    }
    expect(received_without_uuids).toStrictEqual(expected);
    return { message: () => ':)', pass: true };
  },
  toBeSameDocumentExceptUuids(received: Document, expected: Document): jest.CustomMatcherResult {
    expect(received.content).toStrictEqualExceptUuids(expected.content);
    expect(received.sources).toStrictEqual(expected.sources);
    expect(received.metadata).toStrictEqual(expected.metadata);
    return { message: () => ':)', pass: true };
  },
  toBeValidDocumentContent(received: V3DocumentItem[]): jest.CustomMatcherResult {
    return lintDocumentContent(received);
  },
});
