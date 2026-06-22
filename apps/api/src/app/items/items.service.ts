import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Context,
  CreateItemDto,
  filterSearch,
  Item,
  ItemHistory,
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
    const type = dto.type ?? ItemType.Loop;
    const context = dto.context ?? Context.Kerja;
    const row = await this.prisma.item.create({
      data: {
        text: dto.text,
        type,
        context,
        ...(owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId }),
        ...(type !== ItemType.Note && { status: LoopStatus.Open }),
      },
    });
    return toItem(row);
  }

  async findById(id: string, owner: Owner): Promise<Item | null> {
    const row = await this.prisma.item.findFirst({
      where: { id, ...ownerWhere(owner) },
    });
    return row ? toItem(row) : null;
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
    const existing = await this.prisma.item.findFirst({
      where: { id, ...ownerWhere(owner) },
    });
    if (!existing) throw new NotFoundException();

    const data: Record<string, unknown> = { ...dto };
    if (dto.status === LoopStatus.Done) {
      data['doneAt'] = new Date();
    } else if (dto.status !== undefined) {
      data['doneAt'] = null;
    }

    const changes: { field: string; from: string | null; to: string | null }[] = [];
    const trackedFields = ['text', 'status', 'nextStep', 'blockedReason'];
    for (const key of trackedFields) {
      if (key in dto && dto[key as keyof UpdateItemDto] !== undefined) {
        const from = ((existing as Record<string, unknown>)[key] as string | undefined) ?? null;
        const to = String(dto[key as keyof UpdateItemDto]) ?? null;
        if (from !== to) {
          changes.push({ field: key, from, to });
        }
      }
    }

    const ops: unknown[] = [
      this.prisma.item.update({ where: { id, ...ownerWhere(owner) }, data }),
      ...changes.map((c) =>
        this.prisma.itemHistory.create({
          data: { itemId: id, field: c.field, fromValue: c.from, toValue: c.to },
        }),
      ),
    ];
    const [row] = await this.prisma.$transaction(ops as any);
    return toItem(row);
  }

  async getHistory(itemId: string, owner: Owner): Promise<ItemHistory[]> {
    const rows = await this.prisma.itemHistory.findMany({
      where: { item: { id: itemId, ...ownerWhere(owner) } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      field: r.field,
      fromValue: r.fromValue,
      toValue: r.toValue,
      createdAt: r.createdAt,
    }));
  }

  async remove(id: string, owner: Owner): Promise<Item> {
    const row = await this.prisma.item.delete({
      where: { id, ...ownerWhere(owner) },
    });
    return toItem(row);
  }

  async search(q: string, owner: Owner): Promise<Item[]> {
    const needle = q.trim().toLowerCase();
    if (needle === '') {
      const rows = await this.prisma.item.findMany({
        where: ownerWhere(owner),
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(toItem);
    }

    const [itemRows, historyRows] = await Promise.all([
      this.prisma.item.findMany({
        where: ownerWhere(owner),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.itemHistory.findMany({
        where: {
          item: ownerWhere(owner),
          OR: [
            { fromValue: { contains: needle, mode: 'insensitive' } },
            { toValue: { contains: needle, mode: 'insensitive' } },
          ],
        },
        include: { item: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const textMatches = filterSearch(itemRows.map(toItem), q);

    const historyItemIds = new Set<string>();
    const historyItemMap = new Map<string, Item>();
    for (const hr of historyRows) {
      if (!historyItemIds.has(hr.item.id)) {
        historyItemIds.add(hr.item.id);
        historyItemMap.set(hr.item.id, toItem(hr.item));
      }
    }

    const seen = new Set(textMatches.map((i) => i.id));
    const merged = [...textMatches];
    for (const item of historyItemMap.values()) {
      if (!seen.has(item.id)) {
        merged.push(item);
      }
    }

    return merged;
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
