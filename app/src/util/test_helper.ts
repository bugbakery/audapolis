import { V3DocumentItem, V3TimedDocumentItem, Document } from '../core/document';
import { isParagraphItem } from '../state/editor/selectors';

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
    /**
     * Verifies that `received` is accepted by the following automaton:
     *
     *                       paragraph_items
     *                      ┌────────────┐
     *                      │            │
     *                      │            ▼
     *   paragraph_start ┌──┴────────────────┐
     *       ┌──────────►│ In Paragraph      │
     *       │           └┬──────────────────┘
     *   ┌───┴───┐        │paragraph_break ▲
     *   │ Start │        ▼                │ paragraph_start
     *   └───────┘       ┌─────────────────┴─┐             ┌─────────┐
     *       ▲           │ Outside Paragraph ├────────────►│ Accept  │
     *       │           └───────────────────┘    EOF      └─────────┘
     */
    if (received.length == 0) {
      return {
        pass: false,
        message: () => 'every document needs to have at least one item',
      };
    }
    if (received[0].type != 'paragraph_start') {
      return { pass: false, message: () => 'every document needs to start with a paragraph_start' };
    }
    if (received[received.length - 1].type != 'paragraph_break') {
      return { pass: false, message: () => 'every document needs to end with a paragraph_break' };
    }
    let inPara = false;
    for (const item of received) {
      if (isParagraphItem(item) && !inPara) {
        return { pass: false, message: () => 'paragraph item encountered outside of paragraph' };
      }
      if (item.type == 'paragraph_start') {
        if (inPara) {
          return { pass: false, message: () => 'paragraph_start item encountered in paragraph' };
        } else {
          inPara = true;
        }
      }
      if (item.type == 'paragraph_break') {
        if (!inPara) {
          return {
            pass: false,
            message: () => 'paragraph_break item encountered outside of paragraph',
          };
        } else {
          inPara = false;
        }
      }
    }
    return { pass: true, message: () => ':)' };
  },
});
