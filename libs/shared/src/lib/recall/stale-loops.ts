import { ItemType, LoopStatus } from '../item.model';
import type { Item } from '../item.model';

const STALE_DAYS = 7;

export function getStaleItems(items: Item[]): Item[] {
  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  return items.filter(
    (i) =>
      i.type === ItemType.Loop &&
      (i.status === LoopStatus.Open || i.status === LoopStatus.Waiting) &&
      i.updatedAt.getTime() < cutoff,
  );
}
