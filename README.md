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

Deploys as Docker Compose stack behind Caddy (auto TLS via Let's Encrypt).

### Prerequisites (VPS)

- Docker + Docker Compose v2
- Git
- Domain DNS pointing to VPS (e.g. `eling.pipdev.net`)
- Ports 80 + 443 open

### Manual Deploy

```bash
cp .env.production.example .env
# fill in real values
docker compose up --build -d
```

### CI/CD (GitHub Actions)

Push to `main` triggers automatic deploy via `.github/workflows/deploy.yml`.

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Server IP/hostname |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | SSH private key |
| `VPS_PORT` | SSH port (default 22) |
| `DOMAIN` | e.g. `eling.pipdev.net` |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `AUTH_USERNAME` | Login username |
| `AUTH_PASSWORD_HASH` | bcrypt hash (base64 encoded) |
| `JWT_SECRET` | 128-char hex (crypto.randomBytes(64).toString('hex')) |

### Architecture

```
                         ┌──────────────┐
                         │   Caddy       │◄─── Let's Encrypt (auto)
                         │  port 443     │
                         └──┬───────┬────┘
                            │       │
                     /api/* │       │ /*
                            │       │
                    ┌───────▼┐ ┌────▼──────┐
                    │  API    │ │   Web     │
                    │ :3000   │ │  :80      │
                    │ NestJS  │ │  Angular  │
                    └────▲────┘ └───────────┘
                         │
                    ┌────┴────┐
                    │Postgres │
                    │ :5432   │
                    └─────────┘
```

### SSH Deploy Path

- Code lives at `/opt/eling` on VPS
- `.env` is generated from GitHub Secrets each deploy
- Prisma migrations run automatically via Docker Compose health checks

### Database Backup

A cron-ready backup script at `scripts/backup.sh` dumps PostgreSQL via `pg_dump`. Install:

```cron
0 2 * * * /opt/eling/scripts/backup.sh >> /var/log/eling-backup.log 2>&1
```

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
