import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CaptureBarComponent } from './capture-bar.component';
import { ItemService } from '../../core/item.service';

describe('CaptureBarComponent', () => {
  let fixture: ComponentFixture<CaptureBarComponent>;
  let itemService: ItemService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaptureBarComponent],
      providers: [ItemService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(CaptureBarComponent);
    itemService = TestBed.inject(ItemService);
    await fixture.whenStable();
  });

  it('renders capture input', () => {
    expect(fixture.nativeElement.querySelector('input[data-testid="capture-input"]')).toBeTruthy();
  });

  it('calls itemService.create when text is set and onSubmit called', async () => {
    const spy = vi.spyOn(itemService, 'create').mockResolvedValue();
    // set signal directly (component API)
    fixture.componentInstance['text'].set('hello world');
    fixture.detectChanges();
    await (fixture.componentInstance as any).onSubmit();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello world' }));
  });

  it('clears text after submit', async () => {
    vi.spyOn(itemService, 'create').mockResolvedValue();
    fixture.componentInstance['text'].set('test');
    await (fixture.componentInstance as any).onSubmit();
    expect(fixture.componentInstance['text']()).toBe('');
  });
});
