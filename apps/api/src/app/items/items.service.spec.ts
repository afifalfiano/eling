import { Test } from '@nestjs/testing';
import { Context, CreateItemDto, ItemType, LoopStatus, UpdateItemDto } from '@eling/shared';
import { ItemsService } from './items.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  item: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const now = new Date();
const baseRow = {
  id: 'uuid-1',
  userId: null,
  sessionId: 'sid-1',
  type: ItemType.Loop,
  text: 'beli susu',
  context: Context.Pribadi,
  status: LoopStatus.Open,
  createdAt: now,
  updatedAt: now,
  nextStep: null,
  blockedReason: null,
  doneAt: null,
};

const anonOwner = { userId: undefined, sessionId: 'sid-1' };
const userOwner = { userId: 'user-1', sessionId: undefined };

describe('ItemsService', () => {
  let service: ItemsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ItemsService);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('stores item with sessionId for anon owner', async () => {
      const dto: CreateItemDto = { text: 'beli susu', type: ItemType.Loop, context: Context.Pribadi };
      mockPrisma.item.create.mockResolvedValue(baseRow);

      await service.create(dto, anonOwner);

      expect(mockPrisma.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sessionId: 'sid-1' }),
      });
    });

    it('stores item with userId for registered owner', async () => {
      const dto: CreateItemDto = { text: 'task X' };
      mockPrisma.item.create.mockResolvedValue({ ...baseRow, userId: 'user-1', sessionId: null });

      await service.create(dto, userOwner);

      expect(mockPrisma.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1' }),
      });
    });

    it('defaults type=loop and context=kerja', async () => {
      const dto: CreateItemDto = { text: 'review PR' };
      mockPrisma.item.create.mockResolvedValue({ ...baseRow, text: 'review PR', context: Context.Kerja });

      await service.create(dto, anonOwner);

      const call = mockPrisma.item.create.mock.calls[0][0];
      expect(call.data.type).toBe(ItemType.Loop);
      expect(call.data.context).toBe(Context.Kerja);
      expect(call.data.status).toBe(LoopStatus.Open);
    });

    it('does not set status for notes', async () => {
      const dto: CreateItemDto = { text: 'root cause', type: ItemType.Note };
      mockPrisma.item.create.mockResolvedValue({ ...baseRow, type: ItemType.Note, status: null });

      await service.create(dto, anonOwner);

      const call = mockPrisma.item.create.mock.calls[0][0];
      expect(call.data.status).toBeUndefined();
    });
  });

  describe('findById()', () => {
    it('returns item scoped to owner', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(baseRow);

      const result = await service.findById('uuid-1', anonOwner);

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-1', sessionId: 'sid-1' },
      });
      expect(result).toBeTruthy();
      expect(result!.text).toBe('beli susu');
    });

    it('returns null when item not found for owner', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const result = await service.findById('uuid-1', anonOwner);

      expect(result).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('filters by sessionId for anon owner', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      await service.findAll({}, anonOwner);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sessionId: 'sid-1' }) }),
      );
    });

    it('filters by userId for registered owner', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      await service.findAll({}, userOwner);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('applies additional filters alongside ownership', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      await service.findAll({ status: LoopStatus.Open, type: ItemType.Loop }, anonOwner);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'sid-1', status: LoopStatus.Open, type: ItemType.Loop },
        }),
      );
    });
  });

  describe('update()', () => {
    it('sets doneAt when status becomes done', async () => {
      const dto: UpdateItemDto = { status: LoopStatus.Done };
      mockPrisma.item.update.mockResolvedValue({ ...baseRow, status: LoopStatus.Done, doneAt: now });

      await service.update('uuid-1', dto, anonOwner);

      const call = mockPrisma.item.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'uuid-1', sessionId: 'sid-1' });
      expect(call.data.doneAt).toBeInstanceOf(Date);
    });

    it('clears doneAt when status changes away from done', async () => {
      const dto: UpdateItemDto = { status: LoopStatus.Open };
      mockPrisma.item.update.mockResolvedValue({ ...baseRow, status: LoopStatus.Open, doneAt: null });

      await service.update('uuid-1', dto, anonOwner);

      const call = mockPrisma.item.update.mock.calls[0][0];
      expect(call.data.doneAt).toBeNull();
    });
  });

  describe('remove()', () => {
    it('scopes delete to owner', async () => {
      mockPrisma.item.delete.mockResolvedValue(baseRow);

      await service.remove('uuid-1', anonOwner);

      expect(mockPrisma.item.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1', sessionId: 'sid-1' },
      });
    });
  });

  describe('search()', () => {
    it('scopes search to owner and matches keyword', async () => {
      const rows = [
        { ...baseRow, id: 'a', text: 'beli susu', nextStep: null },
        { ...baseRow, id: 'b', text: 'review PR', nextStep: null },
      ];
      mockPrisma.item.findMany.mockResolvedValue(rows);

      const result = await service.search('susu', anonOwner);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 'sid-1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('beli susu');
    });
  });

  describe('export()', () => {
    it('returns all items for userId owner ordered by createdAt desc', async () => {
      mockPrisma.item.findMany.mockResolvedValue([baseRow]);

      const result = await service.export(userOwner);

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });
});
