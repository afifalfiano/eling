import { Test } from '@nestjs/testing';
import { ItemType, LoopStatus } from '@eling/shared';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  getHistory: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  search: jest.fn(),
  export: jest.fn(),
};

function makeReq(overrides: Record<string, unknown> = {}) {
  return { userId: undefined, sessionId: 'sid-1', ...overrides } as any;
}

describe('ItemsController', () => {
  let controller: ItemsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [{ provide: ItemsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ItemsController);
    jest.clearAllMocks();
  });

  it('create passes owner from request', async () => {
    mockService.create.mockResolvedValue({ id: '1' });
    const req = makeReq({ sessionId: 'sid-anon' });

    await controller.create({ text: 'test' }, req);

    expect(mockService.create).toHaveBeenCalledWith(
      { text: 'test' },
      { userId: undefined, sessionId: 'sid-anon' },
    );
  });

  it('findAll passes owner and filters from request', async () => {
    mockService.findAll.mockResolvedValue([]);
    const req = makeReq({ userId: 'user-1', sessionId: undefined });

    await controller.findAll(LoopStatus.Open, ItemType.Loop, undefined, req);

    expect(mockService.findAll).toHaveBeenCalledWith(
      { status: LoopStatus.Open, type: ItemType.Loop, context: undefined },
      { userId: 'user-1', sessionId: undefined },
    );
  });

  it('findById passes id and owner', async () => {
    mockService.findById.mockResolvedValue({ id: 'uuid-1' });
    const req = makeReq({ sessionId: 'sid-1' });

    await controller.findById('uuid-1', req);

    expect(mockService.findById).toHaveBeenCalledWith(
      'uuid-1',
      { userId: undefined, sessionId: 'sid-1' },
    );
  });

  it('history passes id and owner', async () => {
    mockService.getHistory.mockResolvedValue([]);
    const req = makeReq({ sessionId: 'sid-1' });

    await controller.history('uuid-1', req);

    expect(mockService.getHistory).toHaveBeenCalledWith(
      'uuid-1',
      { userId: undefined, sessionId: 'sid-1' },
    );
  });

  it('export calls service.export with owner', async () => {
    mockService.export.mockResolvedValue([]);
    const req = makeReq({ userId: 'user-1', sessionId: undefined });

    await controller.export(req);

    expect(mockService.export).toHaveBeenCalledWith({ userId: 'user-1', sessionId: undefined });
  });
});
