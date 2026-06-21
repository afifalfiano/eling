import { describe, it, expect } from 'vitest';
import { filterSearch } from './filter-search';
import type { Item } from '../item.model';

function item(p: Partial<Item>): Item {
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? 'note',
    text: p.text ?? '',
    context: p.context ?? 'kerja',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    nextStep: p.nextStep,
    doneAt: null,
  };
}

describe('filterSearch', () => {
  it('matches substring in text (case-insensitive)', () => {
    const a = item({ id: 'a', text: 'Bayar cicilan motor' });
    const b = item({ id: 'b', text: 'Ide custom domain' });
    expect(filterSearch([a, b], 'CICILAN').map((i) => i.id)).toEqual(['a']);
  });

  it('matches substring in nextStep', () => {
    const a = item({ id: 'a', text: 'loop', nextStep: 'tanya Roby soal scope' });
    expect(filterSearch([a], 'roby').map((i) => i.id)).toEqual(['a']);
  });

  it('returns input unchanged for empty/whitespace query', () => {
    const items = [item({ id: 'a', text: 'x' })];
    expect(filterSearch(items, '   ')).toEqual(items);
    expect(filterSearch(items, '')).toEqual(items);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterSearch([item({ text: 'abc' })], 'zzz')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [item({ id: 'a', text: 'abc' }), item({ id: 'b', text: 'def' })];
    const snapshot = [...input];
    filterSearch(input, 'abc');
    expect(input).toEqual(snapshot);
  });
});
