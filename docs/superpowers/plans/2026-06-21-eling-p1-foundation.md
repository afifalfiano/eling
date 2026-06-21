# Eling P1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Eling Nx monorepo (web + api + shared) with tested pure recall/filter functions and an applied Prisma `items` migration — no product features.

**Architecture:** Nx workspace at `eling-project/eling/`. `libs/shared` holds framework-free types + pure functions (`orderFeed`, `filterSearch`) consumed by both apps via the `@eling/shared` alias. `apps/api` is a NestJS skeleton exposing only `GET /health`. `apps/web` is an Angular standalone/zoneless shell with Tailwind + a bundle budget. Prisma owns the single `items` table, migrated against a local Docker Postgres.

**Tech Stack:** Nx (latest), Angular (latest stable, standalone + signals + zoneless), NestJS, Prisma, PostgreSQL (Docker, dev only), Vitest (shared + web), Jest (api — documented TRD §13 fallback), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-06-21-eling-p1-foundation-design.md`

**Working directory note:** All `nx`/`prisma` commands run from inside `eling-project/eling/` unless stated otherwise. Per the user's global rule, every shell command is proxied through `rtk`.

---

## File Structure

| File | Responsibility |
|---|---|
| `eling/nx.json`, `eling/package.json`, `eling/tsconfig.base.json` | Workspace config + `@eling/shared` path alias |
| `eling/libs/shared/src/lib/item.model.ts` | `Item`, enums, DTOs (single source of truth) |
| `eling/libs/shared/src/lib/recall/order-feed.ts` | Pure `orderFeed()` |
| `eling/libs/shared/src/lib/recall/order-feed.spec.ts` | Vitest tests |
| `eling/libs/shared/src/lib/recall/filter-search.ts` | Pure `filterSearch()` |
| `eling/libs/shared/src/lib/recall/filter-search.spec.ts` | Vitest tests |
| `eling/libs/shared/src/index.ts` | Barrel export |
| `eling/prisma/schema.prisma` | `items` table |
| `eling/apps/api/src/app/health/health.controller.ts` | `GET /health` |
| `eling/apps/web/src/app/app.config.ts` | Zoneless providers |
| `eling/apps/web/src/app/app.ts` | Blank shell, imports `@eling/shared` (smoke) |
| `eling/apps/web/project.json` | Bundle budget |
| `eling/.env`, `eling/.gitignore` | DB URL (gitignored) |

---

## Task 1: Create the Nx workspace

**Files:**
- Create: `eling/` workspace (generated)

- [ ] **Step 1: Remove the empty placeholder dir so the generator can create it**

The `eling/` subdir exists but is empty. `create-nx-workspace` refuses a pre-existing target.

Run (from `eling-project/`):
```bash
rtk rmdir eling
```
Expected: succeeds silently (dir is empty). If it errors that the dir is non-empty, STOP and report — something unexpected is in it.

- [ ] **Step 2: Generate the workspace (TypeScript preset, npm)**

Run (from `eling-project/`):
```bash
npx --yes create-nx-workspace@latest eling \
  --preset=ts \
  --packageManager=npm \
  --nxCloud=skip \
  --no-interactive
```
Expected: `eling/` created with `nx.json`, `package.json`, `tsconfig.base.json`, empty `packages/` or `libs/`. The npm scope defaults to `@eling`.

- [ ] **Step 3: Verify Nx runs**

Run (from `eling-project/eling/`):
```bash
rtk npx nx --version
```
Expected: prints Nx version (e.g. `20.x`). No error.

- [ ] **Step 4: Commit**

```bash
rtk git add -A
rtk git commit -m "chore(p1): scaffold nx workspace"
```

---

## Task 2: Add Nx plugins

**Files:**
- Modify: `eling/package.json` (devDependencies)

- [ ] **Step 1: Install the plugins**

Run (from `eling-project/eling/`):
```bash
rtk npm install -D @nx/angular @nx/nest @nx/js @nx/vite
```
Expected: installs without peer-dependency errors. (Show this install list to the user before running, per global package-install gate.)

- [ ] **Step 2: Verify plugins are resolvable**

Run:
```bash
rtk npx nx list @nx/angular
```
Expected: lists available generators (e.g. `application`, `library`, `component`).

- [ ] **Step 3: Commit**

```bash
rtk git add package.json package-lock.json
rtk git commit -m "chore(p1): add nx angular/nest/js/vite plugins"
```

---

## Task 3: Generate the shared library

**Files:**
- Create: `eling/libs/shared/*` (generated)
- Modify: `eling/tsconfig.base.json` (alias auto-added)

- [ ] **Step 1: Generate the lib (Vitest, no bundler)**

Run (from `eling-project/eling/`):
```bash
rtk npx nx g @nx/js:lib libs/shared --name=shared --unitTestRunner=vitest --bundler=none --no-interactive
```
Expected: `libs/shared/` created; `tsconfig.base.json` gains a `"@eling/shared"` path entry pointing at `libs/shared/src/index.ts`.

- [ ] **Step 2: Verify the alias exists**

Run:
```bash
rtk grep -n "@eling/shared" tsconfig.base.json
```
Expected: one match mapping to `libs/shared/src/index.ts`.

- [ ] **Step 3: Remove the generator's sample files**

Delete the auto-generated `libs/shared/src/lib/shared.ts` and `shared.spec.ts` (we replace them).

```bash
rtk rm libs/shared/src/lib/shared.ts libs/shared/src/lib/shared.spec.ts
```
Expected: files removed. (These are generator samples, safe to delete.)

- [ ] **Step 4: Commit**

```bash
rtk git add -A
rtk git commit -m "feat(p1): generate @eling/shared library"
```

---

## Task 4: Shared types (`item.model.ts`)

**Files:**
- Create: `eling/libs/shared/src/lib/item.model.ts`
- Modify: `eling/libs/shared/src/index.ts`

- [ ] **Step 1: Write the model**

Create `libs/shared/src/lib/item.model.ts`:
```ts
export type ItemType = 'note' | 'loop';
export type Context = 'kerja' | 'pribadi' | 'other';
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

export interface CreateItemDto {
  text: string;
  type?: ItemType;
  context?: Context;
}

export interface UpdateItemDto {
  text?: string;
  type?: ItemType;
  context?: Context;
  status?: LoopStatus;
  nextStep?: string;
  blockedReason?: string;
}
```

- [ ] **Step 2: Export it from the barrel**

Replace `libs/shared/src/index.ts` with:
```ts
export * from './lib/item.model';
export * from './lib/recall/order-feed';
export * from './lib/recall/filter-search';
```
(The recall exports point to files created in Tasks 5–6; the build in this task will not run yet, so this is fine — next tasks create them before any build.)

- [ ] **Step 3: Commit**

```bash
rtk git add libs/shared/src/lib/item.model.ts libs/shared/src/index.ts
rtk git commit -m "feat(p1): add Item model + DTOs to shared"
```

---

## Task 5: `orderFeed` (TDD)

**Files:**
- Create: `eling/libs/shared/src/lib/recall/order-feed.ts`
- Test: `eling/libs/shared/src/lib/recall/order-feed.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/shared/src/lib/recall/order-feed.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { orderFeed } from './order-feed';
import type { Item } from '../item.model';

function item(p: Partial<Item>): Item {
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? 'note',
    text: p.text ?? 't',
    context: p.context ?? 'kerja',
    createdAt: p.createdAt ?? new Date('2026-01-01'),
    updatedAt: p.updatedAt ?? new Date('2026-01-01'),
    status: p.status,
    nextStep: p.nextStep,
    blockedReason: p.blockedReason,
    doneAt: p.doneAt ?? null,
  };
}

describe('orderFeed', () => {
  it('orders buckets: open loop -> note -> waiting/blocked -> done', () => {
    const note = item({ id: 'n', type: 'note' });
    const open = item({ id: 'o', type: 'loop', status: 'open' });
    const waiting = item({ id: 'w', type: 'loop', status: 'waiting' });
    const blocked = item({ id: 'b', type: 'loop', status: 'blocked' });
    const done = item({ id: 'd', type: 'loop', status: 'done' });

    const result = orderFeed([done, waiting, note, blocked, open]);

    expect(result[0].id).toBe('o'); // open first
    expect(result[1].id).toBe('n'); // note
    expect(result.findIndex((i) => i.id === 'd')).toBe(result.length - 1); // done last
    const waitingIdx = result.findIndex((i) => i.id === 'w');
    const blockedIdx = result.findIndex((i) => i.id === 'b');
    const noteIdx = result.findIndex((i) => i.id === 'n');
    const doneIdx = result.findIndex((i) => i.id === 'd');
    expect(waitingIdx).toBeGreaterThan(noteIdx);
    expect(blockedIdx).toBeGreaterThan(noteIdx);
    expect(doneIdx).toBeGreaterThan(waitingIdx);
  });

  it('sorts by createdAt descending within a bucket', () => {
    const older = item({ id: 'old', type: 'loop', status: 'open', createdAt: new Date('2026-01-01') });
    const newer = item({ id: 'new', type: 'loop', status: 'open', createdAt: new Date('2026-02-01') });
    const result = orderFeed([older, newer]);
    expect(result.map((i) => i.id)).toEqual(['new', 'old']);
  });

  it('returns empty array for empty input', () => {
    expect(orderFeed([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [item({ id: 'a', type: 'loop', status: 'done' }), item({ id: 'b', type: 'loop', status: 'open' })];
    const snapshot = [...input];
    orderFeed(input);
    expect(input).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run (from `eling-project/eling/`):
```bash
rtk npx nx test shared
```
Expected: FAIL — cannot resolve `./order-feed` / `orderFeed is not a function`.

- [ ] **Step 3: Write the minimal implementation**

Create `libs/shared/src/lib/recall/order-feed.ts`:
```ts
import type { Item } from '../item.model';

function bucket(item: Item): number {
  if (item.type === 'loop' && item.status === 'open') return 0;
  if (item.type === 'note') return 1;
  if (item.type === 'loop' && (item.status === 'waiting' || item.status === 'blocked')) return 2;
  return 3; // loop done (or any leftover)
}

export function orderFeed(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byBucket = bucket(a) - bucket(b);
    if (byBucket !== 0) return byBucket;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:
```bash
rtk npx nx test shared
```
Expected: PASS (4 orderFeed tests green).

- [ ] **Step 5: Commit**

```bash
rtk git add libs/shared/src/lib/recall/order-feed.ts libs/shared/src/lib/recall/order-feed.spec.ts
rtk git commit -m "feat(p1): add orderFeed recall ordering"
```

---

## Task 6: `filterSearch` (TDD)

**Files:**
- Create: `eling/libs/shared/src/lib/recall/filter-search.ts`
- Test: `eling/libs/shared/src/lib/recall/filter-search.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/shared/src/lib/recall/filter-search.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { filterSearch } from './filter-search';
import type { Item } from '../item.model';

function item(p: Partial<Item>): Item {
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? 'note',
    text: p.text ?? '',
    context: p.context ?? 'kerja',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    nextStep: p.nextStep,
    doneAt: null,
  };
}

describe('filterSearch', () => {
  it('matches substring in text (case-insensitive)', () => {
    const a = item({ id: 'a', text: 'Bayar cicilan motor' });
    const b = item({ id: 'b', text: 'Ide custom domain' });
    expect(filterSearch([a, b], 'CICILAN').map((i) => i.id)).toEqual(['a']);
  });

  it('matches substring in nextStep', () => {
    const a = item({ id: 'a', text: 'loop', nextStep: 'tanya Roby soal scope' });
    expect(filterSearch([a], 'roby').map((i) => i.id)).toEqual(['a']);
  });

  it('returns input unchanged for empty/whitespace query', () => {
    const items = [item({ id: 'a', text: 'x' })];
    expect(filterSearch(items, '   ')).toEqual(items);
    expect(filterSearch(items, '')).toEqual(items);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterSearch([item({ text: 'abc' })], 'zzz')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [item({ id: 'a', text: 'abc' }), item({ id: 'b', text: 'def' })];
    const snapshot = [...input];
    filterSearch(input, 'abc');
    expect(input).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:
```bash
rtk npx nx test shared
```
Expected: FAIL — cannot resolve `./filter-search`.

- [ ] **Step 3: Write the minimal implementation**

Create `libs/shared/src/lib/recall/filter-search.ts`:
```ts
import type { Item } from '../item.model';

export function filterSearch(items: Item[], q: string): Item[] {
  const needle = q.trim().toLowerCase();
  if (needle === '') return items;
  return items.filter((i) => {
    const haystack = `${i.text} ${i.nextStep ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:
```bash
rtk npx nx test shared
```
Expected: PASS (all shared tests green — orderFeed + filterSearch).

- [ ] **Step 5: Commit**

```bash
rtk git add libs/shared/src/lib/recall/filter-search.ts libs/shared/src/lib/recall/filter-search.spec.ts
rtk git commit -m "feat(p1): add filterSearch keyword filter"
```

---

## Task 7: Prisma schema + Docker Postgres + migration

**Files:**
- Create: `eling/prisma/schema.prisma`
- Create: `eling/.env`
- Modify: `eling/.gitignore`

- [ ] **Step 1: Start a local Postgres container**

Run:
```bash
rtk docker run --name eling-pg -e POSTGRES_PASSWORD=eling -e POSTGRES_USER=eling -e POSTGRES_DB=eling -p 5432:5432 -d postgres:16
```
Expected: prints a container id. Verify: `rtk docker ps` shows `eling-pg` healthy.

- [ ] **Step 2: Install Prisma**

Run:
```bash
rtk npm install -D prisma && rtk npm install @prisma/client
```
(Show install list to user first, per global gate.)

- [ ] **Step 3: Add DATABASE_URL and gitignore .env**

Create `eling/.env`:
```
DATABASE_URL="postgresql://eling:eling@localhost:5432/eling?schema=public"
```
Append to `eling/.gitignore` (create the line if missing):
```
.env
```
Verify the `.env` is ignored:
```bash
rtk git check-ignore .env
```
Expected: prints `.env`.

- [ ] **Step 4: Write the schema**

Create `eling/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Item {
  id            String    @id @default(uuid())
  type          String    // 'note' | 'loop'
  text          String
  context       String    // 'kerja' | 'pribadi' | 'other'
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  status        String?   // 'open' | 'blocked' | 'waiting' | 'done'
  nextStep      String?
  blockedReason String?
  doneAt        DateTime?

  @@map("items")
}
```

- [ ] **Step 5: Create and apply the migration**

Run (from `eling-project/eling/`):
```bash
rtk npx prisma migrate dev --name init_items
```
Expected: creates `prisma/migrations/<ts>_init_items/`, applies it, generates client. No error.

- [ ] **Step 6: Verify the table exists**

Run:
```bash
rtk docker exec eling-pg psql -U eling -d eling -c "\d items"
```
Expected: prints the `items` table with columns `id, type, text, context, createdAt, updatedAt, status, nextStep, blockedReason, doneAt`.

- [ ] **Step 7: Commit**

```bash
rtk git add prisma .gitignore
rtk git commit -m "feat(p1): add Prisma items schema + init migration"
```

---

## Task 8: NestJS api skeleton + `/health`

**Files:**
- Create: `eling/apps/api/*` (generated)
- Create: `eling/apps/api/src/app/health/health.controller.ts`
- Test: `eling/apps/api/src/app/health/health.controller.spec.ts`

- [ ] **Step 1: Generate the Nest app**

Run (from `eling-project/eling/`):
```bash
rtk npx nx g @nx/nest:app apps/api --name=api --e2eTestRunner=none --no-interactive
```
Expected: `apps/api/` created with `main.ts`, `app/app.module.ts`. (Uses Jest — the TRD §13 documented fallback for Nest.)

- [ ] **Step 2: Write the failing controller test**

Create `apps/api/src/app/health/health.controller.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status', async () => {
    const mod = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    const controller = mod.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run:
```bash
rtk npx nx test api
```
Expected: FAIL — cannot find `./health.controller`.

- [ ] **Step 4: Write the controller**

Create `apps/api/src/app/health/health.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
```

Register it in `apps/api/src/app/app.module.ts` — add `HealthController` to the `controllers` array and import it:
```ts
import { HealthController } from './health/health.controller';
// ...
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
```
(Remove the generator's default `AppController`/`AppService` wiring if present, or leave them — but `HealthController` must be registered.)

- [ ] **Step 5: Run the test, verify it passes**

Run:
```bash
rtk npx nx test api
```
Expected: PASS.

- [ ] **Step 6: Verify `/health` serves over HTTP**

Run (background the server, then curl):
```bash
rtk npx nx serve api &
sleep 8
rtk curl -s http://localhost:3000/health
```
Expected: `{"status":"ok"}`. (Default Nx Nest port is 3000; adjust if `main.ts` sets a global prefix — if so the path is `/api/health`.) Stop the server after: `rtk kill %1`.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/api
rtk git commit -m "feat(p1): nest api skeleton with /health"
```

---

## Task 9: Angular web shell + Tailwind + bundle budget + shared smoke import

**Files:**
- Create: `eling/apps/web/*` (generated)
- Modify: `eling/apps/web/src/app/app.config.ts` (zoneless)
- Modify: `eling/apps/web/src/app/app.ts` (smoke import)
- Modify: `eling/apps/web/project.json` (bundle budget)
- Create: Tailwind config + styles

- [ ] **Step 1: Generate the Angular app**

Run (from `eling-project/eling/`):
```bash
rtk npx nx g @nx/angular:app apps/web --name=web --standalone --routing --style=scss --bundler=esbuild --unitTestRunner=vitest --e2eTestRunner=none --ssr=false --no-interactive
```
Expected: `apps/web/` created, standalone, no NgModule.

- [ ] **Step 2: Enable zoneless change detection**

Edit `apps/web/src/app/app.config.ts` — replace zone providers with zoneless:
```ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
  ],
};
```
Then remove `zone.js` from `apps/web/src/polyfills` / `angular.json` polyfills if listed, and remove the `zone.js` import. (If the generator already produced zoneless config on this Angular version, leave it.)

- [ ] **Step 3: Add the `@eling/shared` smoke import**

Edit `apps/web/src/app/app.ts` — import a shared symbol to prove the alias resolves at build time. Set OnPush:
```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { orderFeed } from '@eling/shared';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<main class="min-h-dvh bg-[#FAFAF8] text-[#1F1E1C] p-4">
    <p class="text-sm">Eling — {{ ready() ? 'ready' : 'booting' }}</p>
    <router-outlet />
  </main>`,
})
export class App {
  // smoke usage so the import is not tree-shaken away
  protected readonly ready = signal(orderFeed([]).length === 0);
}
```

- [ ] **Step 4: Install + configure Tailwind**

Run:
```bash
rtk npm install -D tailwindcss postcss autoprefixer
```
Create `apps/web/tailwind.config.js`:
```js
module.exports = {
  content: ['./apps/web/src/**/*.{html,ts}'],
  theme: { extend: {} },
  plugins: [],
};
```
Add Tailwind directives to `apps/web/src/styles.scss` (top of file):
```scss
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Create `apps/web/postcss.config.js`:
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 5: Set the bundle budget**

In `apps/web/project.json`, under `targets.build.configurations.production`, set:
```json
"budgets": [
  { "type": "initial", "maximumWarning": "200kb", "maximumError": "300kb" }
]
```
(If the generator put budgets in `angular.json` instead, edit there.)

- [ ] **Step 6: Verify the web app builds within budget**

Run:
```bash
rtk npx nx build web --configuration=production
```
Expected: build succeeds; no budget error. The `@eling/shared` import resolves (proves the alias works from web).

- [ ] **Step 7: Verify the shell serves**

Run:
```bash
rtk npx nx serve web &
sleep 12
rtk curl -s http://localhost:4200 | rtk grep -q "Eling" && echo "SHELL_OK"
```
Expected: prints `SHELL_OK`. Stop the server: `rtk kill %1`.

- [ ] **Step 8: Commit**

```bash
rtk git add apps/web
rtk git commit -m "feat(p1): angular zoneless shell + tailwind + bundle budget"
```

---

## Task 10: Final P1 verification (Definition of Done)

**Files:** none (verification only)

- [ ] **Step 1: Build both apps**

Run (from `eling-project/eling/`):
```bash
rtk npx nx build web --configuration=production && rtk npx nx build api
```
Expected: both succeed; web within budget.

- [ ] **Step 2: Run all tests**

Run:
```bash
rtk npx nx run-many -t test --all
```
Expected: `shared` (Vitest) + `api` (Jest) green.

- [ ] **Step 3: Confirm `@eling/shared` resolves from api too**

Add a throwaway import check — temporarily add to `apps/api/src/main.ts` top: `import '@eling/shared';` then `rtk npx nx build api`. Expected: builds. Revert the import.

- [ ] **Step 4: Confirm Prisma table**

Run:
```bash
rtk docker exec eling-pg psql -U eling -d eling -c "\dt"
```
Expected: lists `items`.

- [ ] **Step 5: Tag the phase**

```bash
rtk git tag p1-foundation
rtk git commit --allow-empty -m "chore(p1): foundation complete — DoD met"
```

---

## P1 DoD checklist (from spec)

- [ ] `nx build web` + `nx build api` succeed; web within budget.
- [ ] `nx test shared` green (recall + filter specs).
- [ ] `nx serve api` → `/health` 200 `{ status: 'ok' }`.
- [ ] `nx serve web` → shell renders.
- [ ] `@eling/shared` resolves from web and api builds.
- [ ] `prisma migrate` applied; `items` table exists.

## Notes for the executor

- **Nx generator flags drift by version.** If a flag is rejected, run the generator interactively and match the intent in this plan (standalone, vitest for web/shared, no e2e, no SSR).
- **Global prefix:** if `apps/api/src/main.ts` sets `app.setGlobalPrefix('api')`, the health path is `/api/health` — adjust verification curls accordingly.
- **Package installs** (Tasks 2, 7, 9) must be shown to the user before running, per the global approval gate.
- **No auth, no items endpoints, no UI features** in P1 — resist scope creep; those are P2–P4.
