import { ItemType, LoopStatus } from '../item.model';
import type { Item } from '../item.model';

function bucket(item: Item): number {
  if (item.type === ItemType.Loop && item.status === LoopStatus.Open) return 0;
  if (item.type === ItemType.Note) return 1;
  if (item.type === ItemType.Loop && (item.status === LoopStatus.Waiting || item.status === LoopStatus.Blocked)) return 2;
  return 3;
}

export function orderFeed(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byBucket = bucket(a) - bucket(b);
    if (byBucket !== 0) return byBucket;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
