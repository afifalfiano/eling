import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Item } from '@eling/shared';
import { ItemService } from './item.service';

const mockItem = (overrides: Partial<Item> = {}): Item => ({
  id: '1',
  type: 'loop',
  text: 'test',
  context: 'kerja',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  status: 'open',
  ...overrides,
});

describe('ItemService', () => {
  let service: ItemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ItemService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('items() starts empty', () => {
    expect(service.items()).toEqual([]);
  });

  it('loadAll() populates items signal', async () => {
    const promise = service.loadAll();
    http.expectOne('/api/items').flush([
      { ...mockItem(), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    await promise;
    expect(service.items().length).toBe(1);
    expect(service.items()[0].id).toBe('1');
  });

  it('create() optimistically adds item then confirms', async () => {
    const promise = service.create({ text: 'hello', type: 'loop', context: 'kerja' });
    // optimistic: item added before response
    expect(service.items().length).toBe(1);
    expect(service.items()[0].text).toBe('hello');
    http.expectOne('/api/items').flush({
      ...mockItem({ id: 'server-id', text: 'hello' }),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await promise;
    // replaced with server response
    expect(service.items()[0].id).toBe('server-id');
  });

  it('create() rolls back on error', async () => {
    const promise = service.create({ text: 'fail', type: 'loop', context: 'kerja' });
    expect(service.items().length).toBe(1);
    http.expectOne('/api/items').error(new ProgressEvent('error'));
    await promise.catch(() => null);
    expect(service.items().length).toBe(0);
  });

  it('update() patches item in signal', async () => {
    const load = service.loadAll();
    http.expectOne('/api/items').flush([
      { ...mockItem(), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    await load;

    const promise = service.update('1', { status: 'done' });
    http.expectOne('/api/items/1').flush({
      ...mockItem({ status: 'done' }),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await promise;
    expect(service.items()[0].status).toBe('done');
  });

  it('remove() deletes item from signal', async () => {
    const load = service.loadAll();
    http.expectOne('/api/items').flush([
      { ...mockItem(), createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    await load;

    const promise = service.remove('1');
    http.expectOne('/api/items/1').flush({});
    await promise;
    expect(service.items()).toEqual([]);
  });
});
