import { getStaleItems } from './stale-loops';
import { ItemType, LoopStatus, Context } from '../item.model';
import type { Item } from '../item.model';

function item(p: Partial<Item>): Item {
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? ItemType.Note,
    text: p.text ?? 't',
    context: p.context ?? Context.Kerja,
    createdAt: p.createdAt ?? new Date(),
    updatedAt: p.updatedAt ?? new Date(),
    status: p.status,
    nextStep: p.nextStep,
    blockedReason: p.blockedReason,
    doneAt: p.doneAt ?? null,
  };
}

const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
const recentDate = new Date();

describe('getStaleItems', () => {
  it('flags open loops older than 7 days', () => {
    const stale = item({ id: 's', type: ItemType.Loop, status: LoopStatus.Open, updatedAt: oldDate });
    expect(getStaleItems([stale])).toHaveLength(1);
  });

  it('ignores recent open loops', () => {
    const fresh = item({ id: 'f', type: ItemType.Loop, status: LoopStatus.Open, updatedAt: recentDate });
    expect(getStaleItems([fresh])).toHaveLength(0);
  });

  it('ignores done loops even if old', () => {
    const done = item({ id: 'd', type: ItemType.Loop, status: LoopStatus.Done, updatedAt: oldDate });
    expect(getStaleItems([done])).toHaveLength(0);
  });

  it('matches waiting loops too', () => {
    const waiting = item({ id: 'w', type: ItemType.Loop, status: LoopStatus.Waiting, updatedAt: oldDate });
    expect(getStaleItems([waiting])).toHaveLength(1);
  });

  it('ignores notes', () => {
    const note = item({ id: 'n', type: ItemType.Note, updatedAt: oldDate });
    expect(getStaleItems([note])).toHaveLength(0);
  });
});
