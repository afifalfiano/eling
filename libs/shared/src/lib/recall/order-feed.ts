import type { Item } from '../item.model';

function bucket(item: Item): number {
  if (item.type === 'loop' && item.status === 'open') return 0;
  if (item.type === 'note') return 1;
  if (item.type === 'loop' && (item.status === 'waiting' || item.status === 'blocked')) return 2;
  return 3;
}

export function orderFeed(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byBucket = bucket(a) - bucket(b);
    if (byBucket !== 0) return byBucket;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
