import { Pipe, PipeTransform, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Context, ItemType, LoopStatus } from '@eling/shared';
import type { Item } from '@eling/shared';
import { FeedComponent } from './feed.component';
import { ItemService } from '../../core/item.service';
import { ToastService } from '../../core/toast.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ItemRowComponent } from './item-row.component';
import { CaptureBarComponent } from '../capture/capture-bar.component';

@Pipe({ name: 'transloco', standalone: true })
class MockTranslocoPipe implements PipeTransform {
  transform(key: string, params?: Record<string, unknown>): string {
    if (key === 'feed.empty') return 'Kosong';
    if (key === 'feed.openCount') return `${params?.['count'] ?? 0} loop terbuka`;
    return key;
  }
}

@Component({ selector: 'app-item-row', standalone: true, template: '<div>{{ item?.text }}</div>' })
class MockItemRow {
  @Input() item: any;
}

@Component({ selector: 'app-capture-bar', standalone: true, template: '' })
class MockCaptureBar {}

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

describe('FeedComponent', () => {
  let fixture: ComponentFixture<FeedComponent>;
  let itemService: ItemService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedComponent, MockItemRow, MockCaptureBar, MockTranslocoPipe],
      providers: [
        ItemService,
        ToastService,
        provideHttpClient(),
        provideRouter([]),
        { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      ],
    })
      .overrideComponent(FeedComponent, {
        remove: { imports: [ItemRowComponent, CaptureBarComponent, TranslocoModule] as any[] },
        add: { imports: [MockItemRow, MockCaptureBar, MockTranslocoPipe] },
      })
      .compileComponents();
    itemService = TestBed.inject(ItemService);
  });

  it('renders empty state when no items', async () => {
    vi.spyOn(itemService, 'loadAll').mockResolvedValue();
    fixture = TestBed.createComponent(FeedComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Kosong');
  });

  it('renders items from service', async () => {
    vi.spyOn(itemService, 'loadAll').mockResolvedValue();
    (itemService as any)['_items'].set([mkItem(), mkItem({ id: '2', text: 'review PR' })]);
    fixture = TestBed.createComponent(FeedComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('fix bug');
    expect(fixture.nativeElement.textContent).toContain('review PR');
  });

  it('shows error toast when loadAll fails', async () => {
    vi.spyOn(itemService, 'loadAll').mockRejectedValue(new Error('fail'));
    const toastSpy = vi.spyOn(TestBed.inject(ToastService), 'show');
    fixture = TestBed.createComponent(FeedComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(toastSpy).toHaveBeenCalledWith('feed.loadError', 'error');
  });

  it('shows open count', async () => {
    vi.spyOn(itemService, 'loadAll').mockResolvedValue();
    (itemService as any)['_items'].set([
      mkItem(),
      mkItem({ id: '2', status: LoopStatus.Done }),
    ]);
    fixture = TestBed.createComponent(FeedComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1 loop terbuka');
  });
});
