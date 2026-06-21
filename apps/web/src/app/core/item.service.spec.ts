import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Context, ItemType, LoopStatus } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemService } from './item.service';

const mockItem = (overrides: Partial<Item> = {}): Item => ({
  id: '1',
  type: ItemType.Loop,
  text: 'test',
  context: Context.Kerja,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  status: LoopStatus.Open,
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
    const promise = service.create({ text: 'hello', type: ItemType.Loop, context: Context.Kerja });
    expect(service.items().length).toBe(1);
    expect(service.items()[0].text).toBe('hello');
    http.expectOne('/api/items').flush({
      ...mockItem({ id: 'server-id', text: 'hello' }),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await promise;
    expect(service.items()[0].id).toBe('server-id');
  });

  it('create() rolls back on error', async () => {
    const promise = service.create({ text: 'fail', type: ItemType.Loop, context: Context.Kerja });
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

    const promise = service.update('1', { status: LoopStatus.Done });
    http.expectOne('/api/items/1').flush({
      ...mockItem({ status: LoopStatus.Done }),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await promise;
    expect(service.items()[0].status).toBe(LoopStatus.Done);
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
