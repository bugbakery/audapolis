import { V3DocumentItemWithoutUuid, V3TimedDocumentItemWithoutUuid } from '../util/test_helper';
import { Document } from '../core/document';

declare global {
  namespace jest {
    interface Matchers<R> {
      toStrictEqualExceptUuids(
        expected: (V3DocumentItemWithoutUuid | V3TimedDocumentItemWithoutUuid)[]
      ): R;
      toBeValidDocumentContent(): R;
      toBeSameDocumentExceptUuids(expected: Document): R;
    }
  }
}
