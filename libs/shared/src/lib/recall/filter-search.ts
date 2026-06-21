import type { Item } from '../item.model';

export function filterSearch(items: Item[], q: string): Item[] {
  const needle = q.trim().toLowerCase();
  if (needle === '') return items;
  return items.filter((i) => {
    const haystack = `${i.text} ${i.nextStep ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}
