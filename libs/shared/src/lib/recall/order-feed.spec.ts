import { orderFeed } from './order-feed';
import { ItemType, LoopStatus, Context } from '../item.model';
import type { Item } from '../item.model';

function item(p: Partial<Item>): Item {
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? ItemType.Note,
    text: p.text ?? 't',
    context: p.context ?? Context.Kerja,
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
    const note = item({ id: 'n', type: ItemType.Note });
    const open = item({ id: 'o', type: ItemType.Loop, status: LoopStatus.Open });
    const waiting = item({ id: 'w', type: ItemType.Loop, status: LoopStatus.Waiting });
    const blocked = item({ id: 'b', type: ItemType.Loop, status: LoopStatus.Blocked });
    const done = item({ id: 'd', type: ItemType.Loop, status: LoopStatus.Done });

    const result = orderFeed([done, waiting, note, blocked, open]);

    expect(result[0].id).toBe('o');
    expect(result[1].id).toBe('n');
    expect(result.findIndex((i) => i.id === 'd')).toBe(result.length - 1);
    const waitingIdx = result.findIndex((i) => i.id === 'w');
    const blockedIdx = result.findIndex((i) => i.id === 'b');
    const noteIdx = result.findIndex((i) => i.id === 'n');
    const doneIdx = result.findIndex((i) => i.id === 'd');
    expect(waitingIdx).toBeGreaterThan(noteIdx);
    expect(blockedIdx).toBeGreaterThan(noteIdx);
    expect(doneIdx).toBeGreaterThan(waitingIdx);
  });

  it('sorts by createdAt descending within a bucket', () => {
    const older = item({ id: 'old', type: ItemType.Loop, status: LoopStatus.Open, createdAt: new Date('2026-01-01') });
    const newer = item({ id: 'new', type: ItemType.Loop, status: LoopStatus.Open, createdAt: new Date('2026-02-01') });
    const result = orderFeed([older, newer]);
    expect(result.map((i) => i.id)).toEqual(['new', 'old']);
  });

  it('returns empty array for empty input', () => {
    expect(orderFeed([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [
      item({ id: 'a', type: ItemType.Loop, status: LoopStatus.Done }),
      item({ id: 'b', type: ItemType.Loop, status: LoopStatus.Open }),
    ];
    const snapshot = [...input];
    orderFeed(input);
    expect(input).toEqual(snapshot);
  });
});
