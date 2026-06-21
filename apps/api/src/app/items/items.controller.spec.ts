import { Test } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

const mockItemsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  search: jest.fn(),
};

const mockItem = {
  id: 'uuid-1',
  type: 'loop' as const,
  text: 'test item',
  context: 'kerja' as const,
  status: 'open' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ItemsController', () => {
  let controller: ItemsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [{ provide: ItemsService, useValue: mockItemsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ItemsController);
    jest.clearAllMocks();
  });

  it('POST /items calls service.create and returns item', async () => {
    mockItemsService.create.mockResolvedValue(mockItem);

    const result = await controller.create({ text: 'test item' });

    expect(mockItemsService.create).toHaveBeenCalledWith({ text: 'test item' });
    expect(result).toBe(mockItem);
  });

  it('GET /items passes query filters to service.findAll', async () => {
    mockItemsService.findAll.mockResolvedValue([mockItem]);

    const result = await controller.findAll('open', 'loop', 'kerja');

    expect(mockItemsService.findAll).toHaveBeenCalledWith({
      status: 'open',
      type: 'loop',
      context: 'kerja',
    });
    expect(result).toHaveLength(1);
  });

  it('PATCH /items/:id calls service.update and returns updated item', async () => {
    const updated = { ...mockItem, status: 'done' as const };
    mockItemsService.update.mockResolvedValue(updated);

    const result = await controller.update('uuid-1', { status: 'done' });

    expect(mockItemsService.update).toHaveBeenCalledWith('uuid-1', { status: 'done' });
    expect(result.status).toBe('done');
  });

  it('DELETE /items/:id calls service.remove', async () => {
    mockItemsService.remove.mockResolvedValue(mockItem);

    await controller.remove('uuid-1');

    expect(mockItemsService.remove).toHaveBeenCalledWith('uuid-1');
  });

  it('GET /items/search passes q to service.search', async () => {
    mockItemsService.search.mockResolvedValue([mockItem]);

    const result = await controller.search('susu');

    expect(mockItemsService.search).toHaveBeenCalledWith('susu');
    expect(result).toHaveLength(1);
  });

  it('GET /items/search defaults to empty string when q is missing', async () => {
    mockItemsService.search.mockResolvedValue([]);

    await controller.search(undefined as unknown as string);

    expect(mockItemsService.search).toHaveBeenCalledWith('');
  });
});
