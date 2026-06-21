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
    save: 'Simpan', statusLabel: 'Status', markDone: '✓ Tandai selesai', blocked: 'Blocked / menunggu',
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

describe('LoopDetailComponent', () => {
  let fixture: ComponentFixture<LoopDetailComponent>;
  let itemService: ItemService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
          useValue: { params: of({ id: 'loop-1' }) },
        },
      ],
    }).compileComponents();
    itemService = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
    (itemService as any)['_items'].set([mockLoop()]);
    fixture = TestBed.createComponent(LoopDetailComponent);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('renders loop text in textarea', () => {
    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain('fix bug');
  });

  it('calls update when mark done clicked', async () => {
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-done"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', { status: LoopStatus.Done });
  });

  it('calls update when mark blocked clicked', async () => {
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-blocked"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', expect.objectContaining({ status: LoopStatus.Blocked }));
  });

  it('calls remove when delete clicked and confirmed', async () => {
    const spy = vi.spyOn(itemService, 'remove').mockResolvedValue();
    window.confirm = vi.fn(() => true);
    fixture.nativeElement.querySelector('[data-testid="btn-delete"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1');
  });
});

describe('LoopDetailComponent with note', () => {
  let fixture: ComponentFixture<LoopDetailComponent>;
  let itemService: ItemService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
          useValue: { params: of({ id: 'note-1' }) },
        },
      ],
    }).compileComponents();
    itemService = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
    (itemService as any)['_items'].set([mockNote()]);
    fixture = TestBed.createComponent(LoopDetailComponent);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('renders note text in textarea', () => {
    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toContain('buy milk');
  });

  it('does not show status buttons for note', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="btn-done"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid="btn-blocked"]')).toBeFalsy();
  });

  it('calls remove when delete clicked for note', async () => {
    const spy = vi.spyOn(itemService, 'remove').mockResolvedValue();
    window.confirm = vi.fn(() => true);
    const deleteBtn = fixture.nativeElement.querySelector('[data-testid="btn-delete-note"]');
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    expect(spy).toHaveBeenCalledWith('note-1');
  });

  it('calls update when save clicked', async () => {
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    const textarea = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'buy organic milk';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="btn-save-note"]').click();
    expect(spy).toHaveBeenCalled();
  });
});
