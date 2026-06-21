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

export type Owner = { userId?: string; sessionId?: string };

type PrismaRow = {
  id: string;
  userId: string | null;
  sessionId: string | null;
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

function ownerWhere(owner: Owner): Record<string, string | undefined> {
  return owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId };
}

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItemDto, owner: Owner): Promise<Item> {
    const type = dto.type ?? 'loop';
    const context = dto.context ?? 'kerja';
    const row = await this.prisma.item.create({
      data: {
        text: dto.text,
        type,
        context,
        ...(owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId }),
        ...(type !== 'note' && { status: 'open' }),
      },
    });
    return toItem(row);
  }

  async findAll(
    filters: { status?: string; type?: string; context?: string },
    owner: Owner,
  ): Promise<Item[]> {
    const where: Record<string, string | undefined> = { ...ownerWhere(owner) };
    if (filters.status) where['status'] = filters.status;
    if (filters.type) where['type'] = filters.type;
    if (filters.context) where['context'] = filters.context;

    const rows = await this.prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toItem);
  }

  async update(id: string, dto: UpdateItemDto, owner: Owner): Promise<Item> {
    const data: Record<string, unknown> = { ...dto };
    if (dto.status === 'done') {
      data['doneAt'] = new Date();
    } else if (dto.status !== undefined) {
      data['doneAt'] = null;
    }
    const row = await this.prisma.item.update({
      where: { id, ...ownerWhere(owner) },
      data,
    });
    return toItem(row);
  }

  async remove(id: string, owner: Owner): Promise<Item> {
    const row = await this.prisma.item.delete({
      where: { id, ...ownerWhere(owner) },
    });
    return toItem(row);
  }

  async search(q: string, owner: Owner): Promise<Item[]> {
    const rows = await this.prisma.item.findMany({
      where: ownerWhere(owner),
      orderBy: { createdAt: 'desc' },
    });
    return filterSearch(rows.map(toItem), q);
  }

  async export(owner: Owner): Promise<Item[]> {
    const rows = await this.prisma.item.findMany({
      where: ownerWhere(owner),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toItem);
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
