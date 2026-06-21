import { Injectable } from '@nestjs/common';
import {
  Context,
  CreateItemDto,
  filterSearch,
  Item,
  ItemType,
  LoopStatus,
  UpdateItemDto,
} from '@eling/shared';
import { PrismaService } from '../prisma/prisma.service';

type PrismaRow = {
  id: string;
  type: string;
  text: string;
  context: string;
  createdAt: Date;
  updatedAt: Date;
  status: string | null;
  nextStep: string | null;
  blockedReason: string | null;
  doneAt: Date | null;
};

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItemDto): Promise<Item> {
    const type = dto.type ?? 'loop';
    const context = dto.context ?? 'kerja';
    const row = await this.prisma.item.create({
      data: {
        text: dto.text,
        type,
        context,
        ...(type !== 'note' && { status: 'open' }),
      },
    });
    return toItem(row);
  }

  async findAll(filters: {
    status?: string;
    type?: string;
    context?: string;
  }): Promise<Item[]> {
    const where: Record<string, string> = {};
    if (filters.status) where['status'] = filters.status;
    if (filters.type) where['type'] = filters.type;
    if (filters.context) where['context'] = filters.context;

    const rows = await this.prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toItem);
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const data: Record<string, unknown> = { ...dto };
    if (dto.status === 'done') {
      data['doneAt'] = new Date();
    } else if (dto.status !== undefined) {
      data['doneAt'] = null;
    }
    const row = await this.prisma.item.update({ where: { id }, data });
    return toItem(row);
  }

  async remove(id: string): Promise<Item> {
    const row = await this.prisma.item.delete({ where: { id } });
    return toItem(row);
  }

  async search(q: string): Promise<Item[]> {
    const rows = await this.prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return filterSearch(rows.map(toItem), q);
  }
}

function toItem(row: PrismaRow): Item {
  return {
    id: row.id,
    type: row.type as ItemType,
    text: row.text,
    context: row.context as Context,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: (row.status as LoopStatus) ?? undefined,
    nextStep: row.nextStep ?? undefined,
    blockedReason: row.blockedReason ?? undefined,
    doneAt: row.doneAt,
  };
}
