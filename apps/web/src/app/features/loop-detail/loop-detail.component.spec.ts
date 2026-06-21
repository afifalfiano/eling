import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Item } from '@eling/shared';
import { LoopDetailComponent } from './loop-detail.component';
import { ItemService } from '../../core/item.service';

const mockLoop = (): Item => ({
  id: 'loop-1',
  type: 'loop',
  text: 'fix bug',
  context: 'kerja',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'open',
});

describe('LoopDetailComponent', () => {
  let fixture: ComponentFixture<LoopDetailComponent>;
  let itemService: ItemService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopDetailComponent],
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
    // seed item into service signal
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
    expect(spy).toHaveBeenCalledWith('loop-1', { status: 'done' });
  });

  it('calls update when mark blocked clicked', async () => {
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-blocked"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', expect.objectContaining({ status: 'blocked' }));
  });
});
