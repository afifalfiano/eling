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
    blockedReasonPlaceholder: 'Kenapa blocked?', notFound: 'Loop tidak ditemukan.',
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

  it('renders loop text', () => {
    expect(fixture.nativeElement.textContent).toContain('fix bug');
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
});
