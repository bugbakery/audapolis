import { V3DocumentItem } from '../core/document';

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type V3DocumentItemWithoutUuid = DistributiveOmit<V3DocumentItem, 'uuid'>;
export function addUUIDs(items: V3DocumentItemWithoutUuid[]): V3DocumentItem[] {
  return items.map((x, i) => ({ ...x, uuid: i.toString() }));
}
