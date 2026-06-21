import { Test } from '@nestjs/testing';
import { CreateItemDto, UpdateItemDto } from '@eling/shared';
import { ItemsService } from './items.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  item: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const now = new Date();
const baseRow = {
  id: 'uuid-1',
  type: 'loop',
  text: 'beli susu',
  context: 'pribadi',
  status: 'open',
  createdAt: now,
  updatedAt: now,
  nextStep: null,
  blockedReason: null,
  doneAt: null,
};

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
    it('stores text, type, context, and status=open for loops', async () => {
      const dto: CreateItemDto = { text: 'beli susu', type: 'loop', context: 'pribadi' };
      mockPrisma.item.create.mockResolvedValue(baseRow);

      const result = await service.create(dto);

      expect(mockPrisma.item.create).toHaveBeenCalledWith({
        data: { text: 'beli susu', type: 'loop', context: 'pribadi', status: 'open' },
      });
      expect(result.id).toBe('uuid-1');
      expect(result.status).toBe('open');
    });

    it('defaults type=loop and context=kerja when omitted', async () => {
      const dto: CreateItemDto = { text: 'review PR' };
      mockPrisma.item.create.mockResolvedValue({ ...baseRow, text: 'review PR', context: 'kerja' });

      await service.create(dto);

      expect(mockPrisma.item.create).toHaveBeenCalledWith({
        data: { text: 'review PR', type: 'loop', context: 'kerja', status: 'open' },
      });
    });

    it('does not set status for notes', async () => {
      const dto: CreateItemDto = { text: 'root cause: token expired', type: 'note' };
      mockPrisma.item.create.mockResolvedValue({ ...baseRow, type: 'note', status: null });

      await service.create(dto);

      const call = mockPrisma.item.create.mock.calls[0][0];
      expect(call.data.status).toBeUndefined();
    });
  });

  describe('findAll()', () => {
    it('passes provided filters to prisma', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      await service.findAll({ status: 'open', type: 'loop', context: 'kerja' });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: { status: 'open', type: 'loop', context: 'kerja' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits undefined filters from where clause', async () => {
      mockPrisma.item.findMany.mockResolvedValue([]);

      await service.findAll({});

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update()', () => {
    it('sets doneAt to now when status becomes done', async () => {
      const dto: UpdateItemDto = { status: 'done' };
      mockPrisma.item.update.mockResolvedValue({ ...baseRow, status: 'done', doneAt: now });

      await service.update('uuid-1', dto);

      const call = mockPrisma.item.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'uuid-1' });
      expect(call.data.status).toBe('done');
      expect(call.data.doneAt).toBeInstanceOf(Date);
    });

    it('clears doneAt when status changes away from done', async () => {
      const dto: UpdateItemDto = { status: 'open' };
      mockPrisma.item.update.mockResolvedValue({ ...baseRow, status: 'open', doneAt: null });

      await service.update('uuid-1', dto);

      const call = mockPrisma.item.update.mock.calls[0][0];
      expect(call.data.doneAt).toBeNull();
    });

    it('passes nextStep and blockedReason through to prisma', async () => {
      const dto: UpdateItemDto = { nextStep: 'ping Roby', blockedReason: 'waiting for PO' };
      mockPrisma.item.update.mockResolvedValue({ ...baseRow, ...dto });

      await service.update('uuid-1', dto);

      const call = mockPrisma.item.update.mock.calls[0][0];
      expect(call.data.nextStep).toBe('ping Roby');
      expect(call.data.blockedReason).toBe('waiting for PO');
    });
  });

  describe('remove()', () => {
    it('calls prisma.item.delete with correct id', async () => {
      mockPrisma.item.delete.mockResolvedValue(baseRow);

      await service.remove('uuid-1');

      expect(mockPrisma.item.delete).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
    });
  });

  describe('search()', () => {
    it('returns items matching keyword in text', async () => {
      const rows = [
        { ...baseRow, id: 'a', text: 'beli susu', nextStep: null },
        { ...baseRow, id: 'b', text: 'review PR Eling', nextStep: null },
      ];
      mockPrisma.item.findMany.mockResolvedValue(rows);

      const result = await service.search('susu');

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('beli susu');
    });

    it('returns items matching keyword in nextStep', async () => {
      const rows = [
        { ...baseRow, id: 'a', text: 'loop A', nextStep: 'ping Roby' },
        { ...baseRow, id: 'b', text: 'loop B', nextStep: null },
      ];
      mockPrisma.item.findMany.mockResolvedValue(rows);

      const result = await service.search('ping');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('returns all items when query is empty', async () => {
      const rows = [baseRow, { ...baseRow, id: 'b' }];
      mockPrisma.item.findMany.mockResolvedValue(rows);

      const result = await service.search('');

      expect(result).toHaveLength(2);
    });
  });
});
