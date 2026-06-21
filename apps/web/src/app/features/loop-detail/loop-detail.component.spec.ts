import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Context, ItemType, LoopStatus } from '@eling/shared';
import type { Item } from '@eling/shared';
import { LoopDetailComponent } from './loop-detail.component';
import { ItemService } from '../../core/item.service';

const idLang = {
  loopDetail: {
    backAriaLabel: 'Kembali', nextStepLabel: 'Next step', nextStepPlaceholder: 'Langkah berikutnya...',
    save: 'Simpan', statusLabel: 'Status', markDone: '\u2713 Tandai selesai', blocked: 'Blocked / menunggu',
    waiting: 'Menunggu diskusi', reopen: 'Buka kembali', blockedReasonLabel: 'Alasan blocked',
    blockedReasonPlaceholder: 'Kenapa blocked?', notFound: 'Item tidak ditemukan.',
    delete: 'Hapus',
  },
};

const mockLoop = (): Item => ({
  id: 'loop-1',
  type: ItemType.Loop,
  text: 'fix bug',
  context: Context.Kerja,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: LoopStatus.Open,
});

const mockNote = (): Item => ({
  id: 'note-1',
  type: ItemType.Note,
  text: 'buy milk',
  context: Context.Pribadi,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function setup(item: Item) {
  TestBed.resetTestingModule();
  const module = TestBed.configureTestingModule({
    imports: [
      LoopDetailComponent,
      TranslocoTestingModule.forRoot({
        langs: { id: idLang },
        translocoConfig: { defaultLang: 'id' },
        preloadLangs: true,
      }),
    ],
    providers: [
      ItemService,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { params: of({ id: item.id }) },
      },
    ],
  });
  module.compileComponents();
  const itemService = TestBed.inject(ItemService);
  const http = TestBed.inject(HttpTestingController);
  (itemService as any)['_items'].set([item]);
  vi.spyOn(itemService, 'getHistory').mockResolvedValue([]);
  const fixture = TestBed.createComponent(LoopDetailComponent);
  fixture.detectChanges();
  return { fixture, itemService, http };
}

describe('LoopDetailComponent', () => {
  it('renders loop text in textarea', async () => {
    const { fixture } = setup(mockLoop());
    await fixture.whenStable();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain('fix bug');
  });

  it('saves status when done selected then save clicked', async () => {
    const { fixture, itemService } = setup(mockLoop());
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-done"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="btn-save"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', { status: LoopStatus.Done });
  });

  it('saves status when blocked selected then save clicked', async () => {
    const { fixture, itemService } = setup(mockLoop());
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-blocked"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="btn-save"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', expect.objectContaining({ status: LoopStatus.Blocked }));
  });

  it('shows blocked reason input only when Blocked selected', async () => {
    const { fixture } = setup(mockLoop());
    await fixture.whenStable();
    fixture.detectChanges();
    const reasonInput = () => fixture.nativeElement.querySelector('[name="blockedReason"]');
    expect(reasonInput()).toBeFalsy();
    fixture.nativeElement.querySelector('[data-testid="btn-blocked"]').click();
    fixture.detectChanges();
    expect(reasonInput()).toBeTruthy();
  });

  it('removes blocked reason input when switching away from Blocked', async () => {
    const { fixture } = setup(mockLoop());
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[data-testid="btn-blocked"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="blockedReason"]')).toBeTruthy();
    fixture.nativeElement.querySelector('[data-testid="btn-done"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="blockedReason"]')).toBeFalsy();
  });

  it('calls remove when delete clicked and confirmed', async () => {
    const { fixture, itemService } = setup(mockLoop());
    const spy = vi.spyOn(itemService, 'remove').mockResolvedValue();
    window.confirm = vi.fn(() => true);
    fixture.nativeElement.querySelector('[data-testid="btn-delete"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1');
  });
});

describe('LoopDetailComponent with note', () => {
  it('renders note text in textarea', async () => {
    const { fixture } = setup(mockNote());
    await fixture.whenStable();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain('buy milk');
  });

  it('does not show status buttons for note', async () => {
    const { fixture } = setup(mockNote());
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="btn-done"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid="btn-blocked"]')).toBeFalsy();
  });

  it('calls remove when delete clicked for note', async () => {
    const { fixture, itemService } = setup(mockNote());
    const spy = vi.spyOn(itemService, 'remove').mockResolvedValue();
    window.confirm = vi.fn(() => true);
    const deleteBtn = fixture.nativeElement.querySelector('[data-testid="btn-delete"]');
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    expect(spy).toHaveBeenCalledWith('note-1');
  });

  it('saves note text when save clicked', async () => {
    const { fixture, itemService } = setup(mockNote());
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    const textarea = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'buy organic milk';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="btn-save"]').click();
    expect(spy).toHaveBeenCalled();
  });
});
