import { describe, it, expect } from 'vitest';
import { orderFeed } from './order-feed';
import type { Item } from '../item.model';

function item(p: Partial<Item>): Item {
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? 'note',
    text: p.text ?? 't',
    context: p.context ?? 'kerja',
    createdAt: p.createdAt ?? new Date('2026-01-01'),
    updatedAt: p.updatedAt ?? new Date('2026-01-01'),
    status: p.status,
    nextStep: p.nextStep,
    blockedReason: p.blockedReason,
    doneAt: p.doneAt ?? null,
  };
}

describe('orderFeed', () => {
  it('orders buckets: open loop -> note -> waiting/blocked -> done', () => {
    const note = item({ id: 'n', type: 'note' });
    const open = item({ id: 'o', type: 'loop', status: 'open' });
    const waiting = item({ id: 'w', type: 'loop', status: 'waiting' });
    const blocked = item({ id: 'b', type: 'loop', status: 'blocked' });
    const done = item({ id: 'd', type: 'loop', status: 'done' });

    const result = orderFeed([done, waiting, note, blocked, open]);

    expect(result[0].id).toBe('o'); // open first
    expect(result[1].id).toBe('n'); // note
    expect(result.findIndex((i) => i.id === 'd')).toBe(result.length - 1); // done last
    const waitingIdx = result.findIndex((i) => i.id === 'w');
    const blockedIdx = result.findIndex((i) => i.id === 'b');
    const noteIdx = result.findIndex((i) => i.id === 'n');
    const doneIdx = result.findIndex((i) => i.id === 'd');
    expect(waitingIdx).toBeGreaterThan(noteIdx);
    expect(blockedIdx).toBeGreaterThan(noteIdx);
    expect(doneIdx).toBeGreaterThan(waitingIdx);
  });

  it('sorts by createdAt descending within a bucket', () => {
    const older = item({ id: 'old', type: 'loop', status: 'open', createdAt: new Date('2026-01-01') });
    const newer = item({ id: 'new', type: 'loop', status: 'open', createdAt: new Date('2026-02-01') });
    const result = orderFeed([older, newer]);
    expect(result.map((i) => i.id)).toEqual(['new', 'old']);
  });

  it('returns empty array for empty input', () => {
    expect(orderFeed([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [item({ id: 'a', type: 'loop', status: 'done' }), item({ id: 'b', type: 'loop', status: 'open' })];
    const snapshot = [...input];
    orderFeed(input);
    expect(input).toEqual(snapshot);
  });
});
