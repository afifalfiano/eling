# Eling P1 — Foundation (Design Spec)

Status: approved · Owner: Afif · Date: 2026-06-21
Source docs: `PRD - Eling v0.md`, `TRD - Eling v0.md`, `design.md`

## Context

Eling v0 is a single-user personal recall engine (Angular SPA + NestJS + Postgres,
Nx monorepo). v0 DoD is large, so the work is sliced into 5 phases:

| Phase | Scope |
|---|---|
| **P1 Foundation** | Nx workspace, 3 projects wired, shared types + pure recall/filter fns (tested), Prisma `items` migration. No features. |
| P2 API + Auth | Nest `items` CRUD + search, JWT single-user auth, rate-limit. |
| P3 FE core | ItemService (signals, optimistic), CaptureBar, Feed + ItemRow, Tailwind + tokens. |
| P4 Loop + search + i18n | LoopDetail, Search, EOD dump, Export JSON, Transloco ID/EN. |
| P5 Deploy | Docker Compose, Caddy/Let's Encrypt TLS, pg_dump cron, bundle audit. |

**This spec covers P1 only.** Later phases get their own spec → plan cycles.

## Locked decisions

- **Angular:** latest stable (zoneless + signals + new control flow). **Drop `@boundary`/`@catch`** for v0 (TRD §12 marks it optional).
- **Monorepo:** Nx, as TRD §21 (learning goal + v1 foundation).
- **Dev Postgres:** local Docker container (full Compose deferred to P5; user containerizes at deploy).
- **Test runner:** Vitest (FE + BE + shared).

## Goal

A working Nx monorepo where all three projects build, the shared pure functions
are tested, and the Prisma `items` migration is applied. **Zero product features** —
this phase proves the stack.

## Structure

```
eling/
├── apps/
│   ├── web/    # Angular SPA — standalone, signals, zoneless, OnPush, Tailwind, bundle budget
│   └── api/    # NestJS — bootstrap + /health only
├── libs/shared/
│   └── src/
│       ├── item.model.ts        # Item, ItemType, Context, LoopStatus, DTOs
│       ├── recall/
│       │   ├── order-feed.ts     # pure: open → note → waiting/blocked → done
│       │   ├── order-feed.spec.ts
│       │   ├── filter-search.ts  # pure: keyword over text + nextStep
│       │   └── filter-search.spec.ts
│       └── index.ts              # barrel → @eling/shared
├── prisma/
│   ├── schema.prisma            # items table; loop fields nullable; type discriminator
│   └── migrations/
├── nx.json · package.json · tsconfig.base.json   # @eling/shared path alias
```

## Shared library — the testable core

Per TRD §13/§14, pure logic lives in `libs/shared`, framework-free, so it is
trivially unit-tested and reused by FE + BE (single source of truth).

### Types (`item.model.ts`) — mirrors TRD §4

```ts
export type ItemType   = 'note' | 'loop';
export type Context    = 'kerja' | 'pribadi' | 'other';
export type LoopStatus = 'open' | 'blocked' | 'waiting' | 'done';

export interface Item {
  id: string;
  type: ItemType;
  text: string;
  context: Context;
  createdAt: Date;
  updatedAt: Date;
  status?: LoopStatus;
  nextStep?: string;
  blockedReason?: string;
  doneAt?: Date | null;
}

export interface CreateItemDto { text: string; type?: ItemType; context?: Context; }
export interface UpdateItemDto {
  text?: string; type?: ItemType; context?: Context;
  status?: LoopStatus; nextStep?: string; blockedReason?: string;
}
```

(`why`, `doneWhen`, `lastSurfacedAt` intentionally omitted; schema stays stable for v1.)

### `orderFeed(items: Item[]): Item[]`

Pure, deterministic recall ordering (TRD §6). Within every bucket, sort by
`createdAt` descending (newest first):
1. Loop `open`
2. Note
3. Loop `waiting` / `blocked`
4. Loop `done` (last)

No mutation of input. No ML, no scheduling. (Anti-basi triage uses `updatedAt`;
deferred — not in P1.)

### `filterSearch(items: Item[], q: string): Item[]`

Case-insensitive substring match over `text` + `nextStep`, across all statuses.
Empty/whitespace `q` → returns input unchanged. No mutation.

### Tests (Vitest)

- `orderFeed`: correct bucket order; stable within bucket by recency; empty input;
  notes have no status; does not mutate input.
- `filterSearch`: matches in `text`; matches in `nextStep`; case-insensitive;
  empty query passthrough; no match → empty; does not mutate input.
- Target ~80% on these pure fns.

## Prisma

Single `items` table mirroring the `Item` interface. Loop-only fields nullable.
`type` is the discriminator. Migration applied against a local Postgres Docker
container for dev. No seed data in P1 (seed user arrives in P2 auth).

## Apps (skeleton only)

- **api:** NestJS bootstrap + a single `GET /health` returning `{ status: 'ok' }`.
  No items module, no auth, no Prisma client wiring beyond what a health check needs
  (health check does NOT hit the DB in P1).
- **web:** Angular standalone app, zoneless, OnPush default, Tailwind configured,
  bundle budget set in project config (warning ~200KB, error ~300KB). Renders a
  blank/placeholder shell. No features, no Spartan components yet.

## Cross-project wiring

- `@eling/shared` path alias in `tsconfig.base.json`, importable from both `web`
  and `api` (verified by a smoke import that builds).

## P1 Definition of Done

- `nx build web` and `nx build api` succeed; web bundle within budget.
- `nx test shared` green (recall + filter specs).
- `nx serve api` → `GET /health` returns 200 `{ status: 'ok' }`.
- `nx serve web` → blank shell renders without error.
- `@eling/shared` imports resolve from web and api builds.
- `prisma migrate` applied; `items` table exists in dev Postgres (Docker).

## Out of scope (P1)

CRUD endpoints · auth · capture/feed/search/loop-detail UI · i18n · Spartan
components · Export JSON · deployment/Compose/TLS. These belong to P2–P5.
