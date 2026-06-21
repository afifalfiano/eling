# Eling P2 — API + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add NestJS items CRUD + keyword search, single-user JWT auth, and login rate-limiting to the API — so the backend is production-ready behind auth before the frontend is built.

**Architecture:** `PrismaService` (global module) wires the existing `items` DB into NestJS. `ItemsModule` exposes all 5 endpoints; `AuthModule` owns login, JWT signing, `JwtAuthGuard`, and is imported by `ItemsModule` to protect its routes. Rate-limiting lives on `POST /auth/login` via `@nestjs/throttler`. Credentials (username + argon2 hash) live in `.env` — no users table needed for single-user v0.

**Tech Stack:** NestJS 11, `@nestjs/jwt`, `argon2`, `@nestjs/throttler`, Prisma 7, Jest (API test runner, per P1), `@eling/shared` (`Item`, DTOs, `filterSearch`).

**Spec:** `docs/superpowers/specs/2026-06-21-eling-p1-foundation-design.md` (P2 row in phase table)
**Source docs:** `TRD - Eling v0.md` §5 (API), §8 (Auth), `PRD - Eling v0.md`

**Working directory note:** All `nx`/`npm` commands run from inside `eling-project/eling/`.

---

## Implementation Notes (fill in as deviations occur)

_(empty — to be updated by executor)_

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `apps/api/src/app/prisma/prisma.service.ts` | Create | Injectable PrismaClient — `OnModuleInit` connect, `OnModuleDestroy` disconnect |
| `apps/api/src/app/prisma/prisma.module.ts` | Create | `@Global()` module that exports `PrismaService` to every other module |
| `apps/api/src/app/items/items.service.ts` | Create | `create`, `findAll`, `update`, `remove`, `search` — all async, typed against `@eling/shared` |
| `apps/api/src/app/items/items.service.spec.ts` | Create | Jest unit tests — `PrismaService` mocked |
| `apps/api/src/app/items/items.controller.ts` | Create | Route handlers: POST/GET/PATCH/DELETE `/items`, GET `/items/search` |
| `apps/api/src/app/items/items.controller.spec.ts` | Create | Jest unit tests — `ItemsService` mocked, `JwtAuthGuard` overridden |
| `apps/api/src/app/items/items.module.ts` | Create | Declares `ItemsController` + `ItemsService`; imports `AuthModule` (for `JwtAuthGuard`) |
| `apps/api/src/app/auth/auth.service.ts` | Create | `login(username, password)` — reads env creds, argon2 verify, signs JWT |
| `apps/api/src/app/auth/auth.service.spec.ts` | Create | Jest unit tests — `JwtService` mocked, env vars set in `beforeEach` |
| `apps/api/src/app/auth/auth.controller.ts` | Create | `POST /auth/login` with `ThrottlerGuard` |
| `apps/api/src/app/auth/auth.controller.spec.ts` | Create | Jest unit tests — `ThrottlerGuard` overridden |
| `apps/api/src/app/auth/jwt.guard.ts` | Create | `CanActivate` — extracts Bearer token, `JwtService.verifyAsync` |
| `apps/api/src/app/auth/auth.module.ts` | Create | Imports `JwtModule`; provides + exports `AuthService`, `JwtAuthGuard`; exports `JwtModule` |
| `apps/api/src/app/app.module.ts` | Modify | Add `PrismaModule`, `ItemsModule`, `AuthModule`, `ThrottlerModule.forRoot` |
| `apps/api/src/main.ts` | Modify | Add `enableCors` |

---

## Task 1: PrismaService

**Files:**
- Create: `apps/api/src/app/prisma/prisma.service.ts`
- Create: `apps/api/src/app/prisma/prisma.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Create PrismaService**

```ts
// apps/api/src/app/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Create PrismaModule (global)**

```ts
// apps/api/src/app/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Import PrismaModule in AppModule**

```ts
// apps/api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: Build to verify**

Run: `npm exec nx build api`
Expected: webpack success, no errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/prisma/ apps/api/src/app/app.module.ts
git commit -m "feat(p2): add PrismaService + global PrismaModule"
```

---

## Task 2: ItemsModule skeleton

**Files:**
- Create: `apps/api/src/app/items/items.service.ts`
- Create: `apps/api/src/app/items/items.controller.ts`
- Create: `apps/api/src/app/items/items.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Create ItemsService stub**

```ts
// apps/api/src/app/items/items.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}
}
```

- [ ] **Step 2: Create ItemsController stub**

```ts
// apps/api/src/app/items/items.controller.ts
import { Controller } from '@nestjs/common';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}
}
```

- [ ] **Step 3: Create ItemsModule**

```ts
// apps/api/src/app/items/items.module.ts
import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
```

- [ ] **Step 4: Add ItemsModule to AppModule**

```ts
// apps/api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [PrismaModule, ItemsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Build to verify**

Run: `npm exec nx build api`
Expected: webpack success

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/items/ apps/api/src/app/app.module.ts
git commit -m "feat(p2): add ItemsModule skeleton"
```

---

## Task 3: Items CRUD + search — service (TDD)

**Files:**
- Modify: `apps/api/src/app/items/items.service.ts`
- Create: `apps/api/src/app/items/items.service.spec.ts`

Notes:
- `Item`, `CreateItemDto`, `UpdateItemDto`, `filterSearch` all come from `@eling/shared` (alias confirmed in `tsconfig.base.json`).
- Prisma returns plain DB rows (`String?` for nullable fields) — `toItem()` casts them to shared types.
- `search()` fetches all rows then applies `filterSearch` in-memory (single-user, small dataset — Prisma ILIKE not needed in v0).

- [ ] **Step 1: Write failing service tests**

```ts
// apps/api/src/app/items/items.service.spec.ts
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

    it('passes text, nextStep, blockedReason through to prisma', async () => {
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
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm exec nx test api -- --testPathPattern="items.service"`
Expected: FAIL — `create`, `findAll`, `update`, `remove`, `search` not implemented

- [ ] **Step 3: Implement ItemsService**

```ts
// apps/api/src/app/items/items.service.ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm exec nx test api -- --testPathPattern="items.service"`
Expected: 9/9 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/items/items.service.ts apps/api/src/app/items/items.service.spec.ts
git commit -m "feat(p2): items CRUD + search service (TDD)"
```

---

## Task 4: Items CRUD + search — controller (TDD)

**Files:**
- Modify: `apps/api/src/app/items/items.controller.ts`
- Create: `apps/api/src/app/items/items.controller.spec.ts`

Note: `GET /items/search` is declared **before** `GET /items` so NestJS routes the static segment `/search` before any parameterized route that might be added later.

- [ ] **Step 1: Create jwt.guard.ts stub (required before spec compiles)**

The controller and its spec both import `JwtAuthGuard`. The stub lets TypeScript and Jest resolve the import now; the real implementation replaces it in Task 7.

```bash
mkdir -p apps/api/src/app/auth
```

```ts
// apps/api/src/app/auth/jwt.guard.ts
import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(): boolean {
    return true; // replaced in Task 7
  }
}
```

- [ ] **Step 2: Write failing controller tests** (jwt.guard.ts stub must exist from Step 1)

```ts
// apps/api/src/app/items/items.controller.spec.ts
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
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm exec nx test api -- --testPathPattern="items.controller"`
Expected: FAIL — handler methods not found on controller

- [ ] **Step 4: Implement ItemsController**

```ts
// apps/api/src/app/items/items.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateItemDto, UpdateItemDto } from '@eling/shared';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ItemsService } from './items.service';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.itemsService.search(q ?? '');
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('context') context?: string,
  ) {
    return this.itemsService.findAll({ status, type, context });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
```

- [ ] **Step 4: Run controller tests, verify they pass**

Run: `npm exec nx test api -- --testPathPattern="items.controller"`
Expected: 6/6 PASS

- [ ] **Step 5: Run all api tests**

Run: `npm exec nx test api`
Expected: all PASS (P1 health + items.service + items.controller)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/items/items.controller.ts apps/api/src/app/items/items.controller.spec.ts apps/api/src/app/auth/jwt.guard.ts
git commit -m "feat(p2): items CRUD + search controller (TDD)"
```

---

## Task 5: Auth env setup + package install

**Files:**
- Modify: `.env` (add `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `JWT_SECRET`, `CORS_ORIGIN`)
- Modify: `package.json` (via npm install — requires user approval)

⚠️ **Approval gate:** Show user what is being installed before running.

- [ ] **Step 1: Show packages to user and get approval**

Packages to install:
```
@nestjs/jwt        — JWT sign + verify in NestJS
argon2             — password hashing (TRD §8)
@nestjs/throttler  — rate-limit login endpoint
```

Run after approval: `npm install @nestjs/jwt argon2 @nestjs/throttler`
Expected: 3 packages added to `dependencies` in `package.json`

- [ ] **Step 2: Generate argon2 hash for your password**

Replace `yourpassword` with your actual password:

```bash
node -e "const argon2 = require('argon2'); argon2.hash('yourpassword').then(h => console.log(h))"
```

Copy the output (format: `$argon2id$v=19$...`). This is the value for `AUTH_PASSWORD_HASH`.

- [ ] **Step 3: Generate a random JWT secret**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-char hex string).

- [ ] **Step 4: Add auth vars to .env**

Append to `eling/.env` (keep existing `DATABASE_URL`):

```
AUTH_USERNAME=afif
AUTH_PASSWORD_HASH=<argon2 hash from Step 2>
JWT_SECRET=<hex string from Step 3>
CORS_ORIGIN=http://localhost:4200
```

- [ ] **Step 5: Verify .env is gitignored**

Run: `git status`
Expected: `.env` does NOT appear — already gitignored from P1

---

## Task 6: AuthModule — AuthService + AuthController (TDD)

**Files:**
- Modify: `apps/api/src/app/auth/auth.service.ts` (create)
- Create: `apps/api/src/app/auth/auth.service.spec.ts`
- Create: `apps/api/src/app/auth/auth.controller.ts`
- Create: `apps/api/src/app/auth/auth.controller.spec.ts`
- Create: `apps/api/src/app/auth/auth.module.ts`
- Modify: `apps/api/src/app/app.module.ts`

- [ ] **Step 1: Write failing AuthService tests**

```ts
// apps/api/src/app/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

const mockJwtService = { signAsync: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    process.env['AUTH_USERNAME'] = 'afif';
    process.env['AUTH_PASSWORD_HASH'] = await argon2.hash('secret123');
    process.env['JWT_SECRET'] = 'test-secret';
  });

  it('returns access_token when credentials are valid', async () => {
    mockJwtService.signAsync.mockResolvedValue('signed.jwt.token');

    const result = await service.login('afif', 'secret123');

    expect(result).toEqual({ access_token: 'signed.jwt.token' });
    expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub: 'afif' });
  });

  it('returns null when username is wrong', async () => {
    const result = await service.login('wrong', 'secret123');

    expect(result).toBeNull();
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns null when password is wrong', async () => {
    const result = await service.login('afif', 'wrongpassword');

    expect(result).toBeNull();
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns null when env vars are missing', async () => {
    delete process.env['AUTH_USERNAME'];
    delete process.env['AUTH_PASSWORD_HASH'];

    const result = await service.login('afif', 'secret123');

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm exec nx test api -- --testPathPattern="auth.service"`
Expected: FAIL — `AuthService` not implemented

- [ ] **Step 3: Implement AuthService**

```ts
// apps/api/src/app/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string } | null> {
    const expectedUsername = process.env['AUTH_USERNAME'];
    const passwordHash = process.env['AUTH_PASSWORD_HASH'];

    if (!expectedUsername || !passwordHash) return null;
    if (username !== expectedUsername) return null;

    const valid = await argon2.verify(passwordHash, password);
    if (!valid) return null;

    const token = await this.jwt.signAsync({ sub: username });
    return { access_token: token };
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm exec nx test api -- --testPathPattern="auth.service"`
Expected: 4/4 PASS

- [ ] **Step 5: Write failing AuthController tests**

```ts
// apps/api/src/app/auth/auth.controller.spec.ts
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = { login: jest.fn() };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  it('returns access_token when credentials are valid', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'tok' });

    const result = await controller.login({ username: 'afif', password: 'secret' });

    expect(result).toEqual({ access_token: 'tok' });
    expect(mockAuthService.login).toHaveBeenCalledWith('afif', 'secret');
  });

  it('throws 401 when credentials are invalid', async () => {
    mockAuthService.login.mockResolvedValue(null);

    await expect(
      controller.login({ username: 'x', password: 'y' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 6: Run test, verify it fails**

Run: `npm exec nx test api -- --testPathPattern="auth.controller"`
Expected: FAIL — `AuthController` not implemented

- [ ] **Step 7: Implement AuthController**

```ts
// apps/api/src/app/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.authService.login(body.username, body.password);
    if (!result) throw new UnauthorizedException();
    return result;
  }
}
```

- [ ] **Step 8: Run test, verify it passes**

Run: `npm exec nx test api -- --testPathPattern="auth.controller"`
Expected: 2/2 PASS

- [ ] **Step 9: Create AuthModule**

`AuthModule` exports `JwtModule` + `JwtAuthGuard` so `ItemsModule` can import both via one import.

```ts
// apps/api/src/app/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 10: Add AuthModule + ThrottlerModule to AppModule**

```ts
// apps/api/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    PrismaModule,
    ItemsModule,
    AuthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

Note: `ThrottlerModule.forRoot` registers a global module — `ThrottlerGuard` becomes available to `AuthController` without `AuthModule` needing to import it separately.

- [ ] **Step 11: Add AuthModule to ItemsModule**

`ItemsModule` imports `AuthModule` to get `JwtAuthGuard` in its DI scope:

```ts
// apps/api/src/app/items/items.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [AuthModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
```

- [ ] **Step 12: Run all api tests**

Run: `npm exec nx test api`
Expected: all PASS

- [ ] **Step 13: Build api**

Run: `npm exec nx build api`
Expected: webpack success

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/app/auth/ apps/api/src/app/items/items.module.ts apps/api/src/app/app.module.ts
git commit -m "feat(p2): auth module — login, JWT sign, rate-limit"
```

---

## Task 7: JwtAuthGuard — real implementation

**Files:**
- Modify: `apps/api/src/app/auth/jwt.guard.ts` (replace stub)

The stub created in Task 4 always returns `true`. Replace it with the real token-verifying implementation.

- [ ] **Step 1: Replace stub with real JwtAuthGuard**

```ts
// apps/api/src/app/auth/jwt.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = authHeader.slice(7);
    try {
      await this.jwt.verifyAsync(token, {
        secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me',
      });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

- [ ] **Step 2: Run all api tests**

Run: `npm exec nx test api`
Expected: all PASS — controller tests still pass because they `overrideGuard(JwtAuthGuard)`

- [ ] **Step 3: Build api**

Run: `npm exec nx build api`
Expected: webpack success

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/auth/jwt.guard.ts
git commit -m "feat(p2): JwtAuthGuard — verify Bearer token"
```

---

## Task 8: CORS + final api wiring

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Enable CORS in main.ts**

```ts
// apps/api/src/main.ts
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
    credentials: true,
  });
  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
```

- [ ] **Step 2: Run all api tests**

Run: `npm exec nx test api`
Expected: all PASS

- [ ] **Step 3: Build api**

Run: `npm exec nx build api`
Expected: webpack success

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(p2): enable CORS for Angular dev origin"
```

---

## Task 9: Final P2 verification (Definition of Done)

- [ ] **Step 1: Start Docker Postgres**

Run: `docker start eling-pg`
Expected: container starts (or already running)

- [ ] **Step 2: Start api**

Run: `npm exec nx serve api`
Expected: `🚀 Application is running on: http://localhost:3000/api`

Leave running; open a second terminal for the smoke tests below.

- [ ] **Step 3: Smoke test — auth**

```bash
# Login with correct creds
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"afif","password":"yourpassword"}' | jq .
# Expected: { "access_token": "eyJ..." }

# Store token (replace with actual value from above)
TOKEN=eyJ...

# Wrong password → 401
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"afif","password":"wrong"}' | jq .
# Expected: { "statusCode": 401, "message": "Unauthorized" }

# Unauthenticated items request → 401
curl -s http://localhost:3000/api/items | jq .
# Expected: { "statusCode": 401 }
```

- [ ] **Step 4: Smoke test — items CRUD**

```bash
# Create
curl -s -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"beli susu","type":"loop","context":"pribadi"}' | jq .
# Expected: item with id, type=loop, status=open

# Store item id
ITEM_ID=<id from above>

# Feed
curl -s "http://localhost:3000/api/items" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: array with the item

# Search
curl -s "http://localhost:3000/api/items/search?q=susu" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: array with the item

# Mark done
curl -s -X PATCH "http://localhost:3000/api/items/$ITEM_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"done"}' | jq .
# Expected: item with status=done, doneAt not null

# Delete
curl -s -X DELETE "http://localhost:3000/api/items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: deleted item object

# Create a note (no status)
curl -s -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"root cause: token expired","type":"note"}' | jq .
# Expected: item with type=note, status=null
```

- [ ] **Step 5: Tag the phase**

```bash
git tag p2-api-auth
```

---

## P2 DoD checklist

- [ ] `POST /api/auth/login` → `{ access_token }` on valid creds.
- [ ] `POST /api/auth/login` → `401` on wrong username or password.
- [ ] Login rate-limited: 5 requests per 60 seconds.
- [ ] All `/api/items*` routes return `401` without a valid JWT.
- [ ] `POST /api/items` creates item; defaults `type=loop`, `context=kerja`, `status=open`; notes have no `status`.
- [ ] `GET /api/items?status=&type=&context=` returns filtered feed ordered newest-first.
- [ ] `PATCH /api/items/:id { status: 'done' }` sets `doneAt` to current timestamp.
- [ ] `PATCH /api/items/:id { status: 'open' }` clears `doneAt`.
- [ ] `DELETE /api/items/:id` removes item.
- [ ] `GET /api/items/search?q=` returns items matching keyword in `text` or `nextStep`.
- [ ] All unit tests green.
- [ ] `nx build api` succeeds.
- [ ] CORS allows `http://localhost:4200` (Angular dev server).

## Notes for the executor

- **Package installs** (Task 5) require user approval per global approval gate — show list first, then run.
- **argon2 hash:** must be generated and stored in `.env` before running `nx serve api`. The hash is never committed.
- **JWT_SECRET fallback:** `'dev-secret-change-me'` is used if `JWT_SECRET` env var is missing — acceptable for `nx test`, but production `.env` must have a real secret.
- **ThrottlerGuard DI:** if `@UseGuards(ThrottlerGuard)` on `AuthController` fails with "Nest can't resolve dependencies", add `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])` to `AuthModule` imports (in addition to `AppModule`).
- **Circular import risk:** `ItemsModule` imports `AuthModule`, `AuthModule` does NOT import `ItemsModule` — no circular dependency.
- **jwt.guard.ts stub (Task 4):** a stub is created early so `items.controller.ts` compiles immediately. It's replaced with the real implementation in Task 7. Don't skip the replacement.
