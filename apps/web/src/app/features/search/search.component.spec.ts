import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SearchComponent } from './search.component';
import { ItemService } from '../../core/item.service';

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [
        ItemService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchComponent);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('renders search input', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="search-input"]')).toBeTruthy();
  });

  it('calls search API after debounce', async () => {
    const itemService = TestBed.inject(ItemService);
    const spy = vi.spyOn(itemService, 'search').mockResolvedValue([]);
    // directly call onInput to bypass debounce in unit test
    (fixture.componentInstance as any).onInput('test');
    await new Promise((r) => setTimeout(r, 350));
    expect(spy).toHaveBeenCalledWith('test');
  });

  it('shows empty state when no results after search', async () => {
    const itemService = TestBed.inject(ItemService);
    vi.spyOn(itemService, 'search').mockResolvedValue([]);
    (fixture.componentInstance as any).onInput('xyz');
    await new Promise((r) => setTimeout(r, 350));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tidak ada hasil');
  });
});
