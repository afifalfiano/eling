import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Context, ItemType, LoopStatus } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemRowComponent } from './item-row.component';

const mkItem = (overrides: Partial<Item> = {}): Item => ({
  id: '1',
  type: ItemType.Loop,
  text: 'fix bug',
  context: Context.Kerja,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: LoopStatus.Open,
  ...overrides,
});

describe('ItemRowComponent', () => {
  let fixture: ComponentFixture<ItemRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemRowComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ItemRowComponent);
  });

  it('renders loop text', async () => {
    fixture.componentRef.setInput('item', mkItem());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('fix bug');
  });

  it('adds done style when status is done', async () => {
    fixture.componentRef.setInput('item', mkItem({ status: LoopStatus.Done }));
    await fixture.whenStable();
    const el = fixture.nativeElement.querySelector('[data-testid="item-text"]');
    expect(el?.classList.contains('line-through')).toBe(true);
  });

  it('renders note with dot indicator', async () => {
    fixture.componentRef.setInput('item', mkItem({ type: ItemType.Note, status: undefined }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="note-dot"]')).toBeTruthy();
  });

  it('emits open event when row clicked', async () => {
    fixture.componentRef.setInput('item', mkItem());
    await fixture.whenStable();
    let emitted: Item | undefined;
    fixture.componentInstance.open.subscribe((v: Item) => (emitted = v));
    fixture.nativeElement.querySelector('[data-testid="item-row"]').click();
    expect(emitted?.id).toBe('1');
  });
});
