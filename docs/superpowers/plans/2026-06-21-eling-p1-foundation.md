# Eling P1 — Foundation Implementation Plan

> **Status: COMPLETE — tagged `p1-foundation` on 2026-06-21**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Eling Nx monorepo (web + api + shared) with tested pure recall/filter functions and an applied Prisma `items` migration — no product features.

**Architecture:** Nx workspace at `eling-project/eling/`. `libs/shared` holds framework-free types + pure functions (`orderFeed`, `filterSearch`) consumed by both apps via the `@eling/shared` alias. `apps/api` is a NestJS skeleton exposing only `GET /health`. `apps/web` is an Angular standalone/zoneless shell with Tailwind + a bundle budget. Prisma owns the single `items` table, migrated against a local Docker Postgres.

**Tech Stack:** Nx (latest), Angular (latest stable, standalone + signals + zoneless), NestJS, Prisma, PostgreSQL (Docker, dev only), Vitest (shared + web), Jest (api — documented TRD §13 fallback), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-06-21-eling-p1-foundation-design.md`

**Working directory note:** All `nx`/`prisma` commands run from inside `eling-project/eling/` unless stated otherwise. Per the user's global rule, every shell command is proxied through `rtk`.

---

## Implementation Notes (deviations from plan)

- `@nx/vite` v23 has no `test` executor — used `nx:run-commands` with `npx vitest run` instead.
- Prisma v7 removed `url` from `schema.prisma` datasource — created `prisma.config.ts` using `defineConfig` + `env()`.
- Angular Build v21 reads PostCSS config only from `postcss.config.json` (not `.js`) — created `apps/web/postcss.config.json` with `@tailwindcss/postcss` (Tailwind v4 split the PostCSS plugin).
- NestJS API global prefix is `api` — health endpoint is `/api/health` not `/health`.
- Test runner flags (`--unitTestRunner`, `--bundler`) silently ignored by `npm exec nx g` (treated as npm env vars) — jest was generated for shared, manually converted to vitest.

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
| `eling/prisma.config.ts` | Prisma v7 datasource config (replaces schema `url`) |
| `eling/apps/api/src/app/health/health.controller.ts` | `GET /health` (served at `/api/health`) |
| `eling/apps/web/src/app/app.config.ts` | Zoneless providers |
| `eling/apps/web/src/app/app.ts` | Blank shell, imports `@eling/shared` (smoke) |
| `eling/apps/web/project.json` | Bundle budget |
| `eling/apps/web/postcss.config.json` | Tailwind v4 PostCSS config (JSON format required by Angular Build) |
| `eling/.env`, `eling/.gitignore` | DB URL (gitignored) |

---

## Task 1: Initialize Nx in the existing repo ✅

- [x] **Step 1: Initialize npm + install Nx (in the existing eling/ repo)**
- [x] **Step 2: Run `nx init`**
- [x] **Step 3: Set the npm scope so libs get the `@eling/*` alias**
- [x] **Step 4: Verify Nx runs**
- [x] **Step 5: Commit** — `chore(p1): initialize nx in existing repo`

---

## Task 2: Add Nx plugins ✅

- [x] **Step 1: Install the plugins** — `@nx/angular @nx/nest @nx/js @nx/vite`
- [x] **Step 2: Verify plugins are resolvable**
- [x] **Step 3: Commit** — `chore(p1): add nx angular/nest/js/vite plugins`

---

## Task 3: Generate the shared library ✅

- [x] **Step 1: Generate the lib** — vitest configured manually (generator ignored flags)
- [x] **Step 2: Verify the alias exists** — `@eling/shared` → `libs/shared/src/index.ts`
- [x] **Step 3: Remove the generator's sample files**
- [x] **Step 4: Commit** — `feat(p1): generate @eling/shared library`

---

## Task 4: Shared types (`item.model.ts`) ✅

- [x] **Step 1: Write the model**
- [x] **Step 2: Export it from the barrel**
- [x] **Step 3: Commit** — `feat(p1): add Item model + DTOs to shared`

---

## Task 5: `orderFeed` (TDD) ✅

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run the test, verify it fails**
- [x] **Step 3: Write the minimal implementation**
- [x] **Step 4: Run the test, verify it passes** — 4/4 green
- [x] **Step 5: Commit** — `feat(p1): add orderFeed recall ordering`

---

## Task 6: `filterSearch` (TDD) ✅

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run the test, verify it fails**
- [x] **Step 3: Write the minimal implementation**
- [x] **Step 4: Run the test, verify it passes** — 5/5 green (9 total with orderFeed)
- [x] **Step 5: Commit** — `feat(p1): add filterSearch keyword filter`

---

## Task 7: Prisma schema + Docker Postgres + migration ✅

- [x] **Step 1: Start a local Postgres container** — `eling-pg` on port 5432
- [x] **Step 2: Install Prisma** — prisma v7.8.0 + @prisma/client
- [x] **Step 3: Add DATABASE_URL and gitignore .env**
- [x] **Step 4: Write the schema** — with Prisma v7 `prisma.config.ts` workaround
- [x] **Step 5: Create and apply the migration** — `20260621041908_init_items`
- [x] **Step 6: Verify the table exists** — `items` table confirmed via psql
- [x] **Step 7: Commit** — `feat(p1): add Prisma items schema + init migration`

---

## Task 8: NestJS api skeleton + `/health` ✅

- [x] **Step 1: Generate the Nest app**
- [x] **Step 2: Write the failing controller test**
- [x] **Step 3: Run the test, verify it fails**
- [x] **Step 4: Write the controller** + register in AppModule
- [x] **Step 5: Run the test, verify it passes** — 1/1 green
- [x] **Step 6: Verify `/health` serves over HTTP** — `GET /api/health` → `{"status":"ok"}`
- [x] **Step 7: Commit** — `feat(p1): nest api skeleton with /health`

---

## Task 9: Angular web shell + Tailwind + bundle budget + shared smoke import ✅

- [x] **Step 1: Generate the Angular app**
- [x] **Step 2: Enable zoneless change detection** — `provideZonelessChangeDetection()`
- [x] **Step 3: Add the `@eling/shared` smoke import**
- [x] **Step 4: Install + configure Tailwind** — v4, `postcss.config.json` (not .js)
- [x] **Step 5: Set the bundle budget** — 200kb warning / 300kb error
- [x] **Step 6: Verify the web app builds within budget** — 193.56 kB ✓
- [x] **Step 7: Verify the shell serves** — SHELL_OK
- [x] **Step 8: Commit** — `feat(p1): angular zoneless shell + tailwind + bundle budget`

---

## Task 10: Final P1 verification (Definition of Done) ✅

- [x] **Step 1: Build both apps** — web 193.56 kB, api webpack success
- [x] **Step 2: Run all tests** — shared 9/9 (Vitest), api 1/1 (Jest)
- [x] **Step 3: Confirm `@eling/shared` resolves from api too** — throwaway import built successfully
- [x] **Step 4: Confirm Prisma table** — `items` listed in `\dt`
- [x] **Step 5: Tag the phase** — `p1-foundation` tagged

---

## P1 DoD checklist (from spec)

- [x] `nx build web` + `nx build api` succeed; web within budget.
- [x] `nx test shared` green (recall + filter specs).
- [x] `nx serve api` → `/api/health` 200 `{ status: 'ok' }`.
- [x] `nx serve web` → shell renders.
- [x] `@eling/shared` resolves from web and api builds.
- [x] `prisma migrate` applied; `items` table exists.

## Notes for the executor

- **Nx generator flags drift by version.** If a flag is rejected, run the generator interactively and match the intent in this plan (standalone, vitest for web/shared, no e2e, no SSR).
- **Global prefix:** if `apps/api/src/main.ts` sets `app.setGlobalPrefix('api')`, the health path is `/api/health` — adjust verification curls accordingly.
- **Package installs** (Tasks 2, 7, 9) must be shown to the user before running, per the global approval gate.
- **No auth, no items endpoints, no UI features** in P1 — resist scope creep; those are P2–P4.
