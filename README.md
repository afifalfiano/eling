# Eling v0.1.0

Personal recall engine. Holds things for you and surfaces them when needed — without you searching.

**Eling** (Javanese: *remember* + *grounded/aware*) solves two problems: forgetting and panic when plans slip. The answer to both: get it out of your head.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Angular 22 (standalone, signals, OnPush) |
| UI | Tailwind CSS + inline SVG icons |
| i18n | Transloco (ID/EN runtime switch) |
| Backend | NestJS 11 (REST API, `/api` prefix) |
| Database | PostgreSQL 16 via Prisma |
| Monorepo | Nx 23 |
| Tests | Vitest (web), Jest (api) |
| Deploy | Docker Compose + Caddy (HTTPS, Let's Encrypt) |

## Structure

```
eling/
├── apps/
│   ├── web/          # Angular SPA
│   └── api/          # NestJS API
├── libs/
│   └── shared/       # Item types, DTOs, pure recall functions
├── prisma/           # schema.prisma + migrations
└── scripts/          # backup.sh (pg_dump cron)
```

## Core Concepts

- **Loop** — something with an action to take (open → blocked/waiting → done)
- **Note** — something to remember (no checkbox, no lifecycle)
- **Feed** — pull-based daily view, ordered: open loops → notes → waiting → done

## Development

```bash
# Serve both apps
npm exec nx serve web
npm exec nx serve api

# Run all tests
npm exec nx run-many -t test

# Affected only
npm exec nx affected -t test,lint,build
```

Requires a running PostgreSQL. Copy `.env.production.example` to `.env` and fill in values.

## Deploy

```bash
# Build and start all containers
docker compose up -d --build
```

See `.env.production.example` for required environment variables (`DOMAIN`, `POSTGRES_PASSWORD`, `JWT_SECRET`, etc.).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account (migrates anon items) |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/items` | Capture item |
| GET | `/api/items` | Feed (supports `?status=&type=&context=`) |
| GET | `/api/items/search?q=` | Keyword search across all items |
| GET | `/api/items/export` | Download all items as JSON |
| GET | `/api/items/:id` | Get single item |
| GET | `/api/items/:id/history` | Change history for a loop |
| PATCH | `/api/items/:id` | Update text / status / nextStep |
| DELETE | `/api/items/:id` | Delete item |
| GET | `/api/health` | Health check |

## v0 Definition of Done

- [x] Capture (text, type toggle, context) + optimistic UI
- [x] Feed ordered correctly (open loops → notes → waiting → done)
- [x] Loop lifecycle: next step, blocked/waiting reason, mark done
- [x] Keyword search across all history
- [x] Export JSON
- [x] Daily DB backup (`scripts/backup.sh`)
- [x] Single-user auth (JWT) + HTTPS via Caddy
- [x] Unit tests green (88 tests)
- [x] Language toggle ID/EN

**Next:** use it for 30 days. No new features before that.
