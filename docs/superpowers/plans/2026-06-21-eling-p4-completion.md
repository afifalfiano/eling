# P4 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Eling v0 — fix auth hash bug, add Export JSON, add Transloco i18n (ID/EN toggle), and Docker deployment with DB backup.

**Architecture:** Auth service swaps argon2 for bcryptjs with base64-encoded hash (no `$` parsing issues in .env). Export is client-side (fetch all items → blob download). i18n uses `@jsverse/transloco` runtime switching with lazy-loaded JSON files. Docker: multistage builds → Caddy reverse proxy (automatic TLS) → nginx (web) + NestJS (api) + Postgres.

**Tech Stack:** bcryptjs, `@jsverse/transloco`, Docker, Caddy 2, nginx 1.27-alpine, node:22-alpine, Postgres 16.

**Out of scope:** dark mode, PWA, push notifications, multi-user.

---

## File map

| File | Action | Purpose |
|---|---|---|
| `apps/api/src/app/auth/auth.service.ts` | Modify | Replace argon2 with bcryptjs + base64 decode |
| `apps/api/src/app/auth/auth.service.spec.ts` | Modify | Update specs to use bcryptjs |
| `apps/api/src/main.ts` | Read + maybe modify | Verify CORS_ORIGIN used, add migrate on boot |
| `.env` | Modify | Replace argon2 hash with bcrypt base64 hash |
| `package.json` | Modify | Remove argon2, add bcryptjs + @types/bcryptjs |
| `apps/web/src/app/core/item.service.ts` | Modify | Add `downloadExport()` method |
| `apps/web/src/app/app.ts` | Modify | Add export button + language toggle |
| `apps/web/src/app/app.config.ts` | Modify | Add provideTransloco |
| `apps/web/src/assets/i18n/id.json` | Create | Indonesian translations |
| `apps/web/src/assets/i18n/en.json` | Create | English translations |
| `apps/web/src/app/features/login/login.component.html` | Modify | Add transloco pipe |
| `apps/web/src/app/features/login/login.component.ts` | Modify | Import TranslocoModule |
| `apps/web/src/app/features/feed/feed.component.html` | Modify | Add transloco pipe |
| `apps/web/src/app/features/feed/feed.component.ts` | Modify | Import TranslocoModule |
| `apps/web/src/app/features/capture/capture-bar.component.html` | Modify | Add transloco pipe |
| `apps/web/src/app/features/capture/capture-bar.component.ts` | Modify | Import TranslocoModule |
| `apps/web/src/app/features/loop-detail/loop-detail.component.html` | Modify | Add transloco pipe |
| `apps/web/src/app/features/loop-detail/loop-detail.component.ts` | Modify | Import TranslocoModule |
| `apps/web/src/app/features/search/search.component.html` | Modify | Add transloco pipe |
| `apps/web/src/app/features/search/search.component.ts` | Modify | Import TranslocoModule |
| `.dockerignore` | Create | Exclude node_modules/dist from build context |
| `apps/api/Dockerfile` | Create | Multistage build for NestJS API |
| `apps/web/Dockerfile` | Create | Multistage build for Angular + nginx |
| `apps/web/nginx.conf` | Create | SPA routing (try_files → index.html) |
| `docker-compose.yml` | Create | Orchestrate postgres + api + web + caddy |
| `Caddyfile` | Create | Reverse proxy + automatic TLS |
| `.env.production.example` | Create | Template for prod env vars |
| `scripts/backup.sh` | Create | pg_dump + rotation script |

---

### Task 1: Auth — replace argon2 with bcryptjs + base64-encoded hash

**Problem:** dotenv v17 expands `$argon2id` inside single-quoted values on some systems. argon2 hash contains multiple `$` signs. Fix: switch to bcryptjs (pure JS, no native build required) and store the hash base64-encoded so `.env` has zero `$` characters.

**Files:**
- Modify: `apps/api/src/app/auth/auth.service.ts`
- Modify: `apps/api/src/app/auth/auth.service.spec.ts`
- Modify: `package.json`
- Modify: `.env`

- [ ] **Step 1: Install bcryptjs, uninstall argon2**

```bash
cd eling && npm install bcryptjs && npm install -D @types/bcryptjs && npm uninstall argon2
```

Expected: `package.json` no longer has `argon2`, has `"bcryptjs": "^2.4.x"` and `"@types/bcryptjs": "^2.4.x"`.

- [ ] **Step 2: Remove argon2 from allowScripts in package.json**

In `package.json`, find the `allowScripts` block and remove the `"argon2@0.44.0": true` entry. (bcryptjs is pure JS — no script needed.)

- [ ] **Step 3: Update auth.service.spec.ts (write failing spec first)**

Replace `apps/api/src/app/auth/auth.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
    const hash = await bcrypt.hash('secret123', 10);
    process.env['AUTH_USERNAME'] = 'afif';
    process.env['AUTH_PASSWORD_HASH'] = Buffer.from(hash).toString('base64');
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

- [ ] **Step 4: Run spec — expect FAIL**

```bash
npm exec nx test api -- --testPathPattern=auth.service.spec 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module 'argon2'` or similar.

- [ ] **Step 5: Update auth.service.ts**

Replace `apps/api/src/app/auth/auth.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string } | null> {
    const expectedUsername = process.env['AUTH_USERNAME'];
    const hashB64 = process.env['AUTH_PASSWORD_HASH'];

    if (!expectedUsername || !hashB64) return null;
    if (username !== expectedUsername) return null;

    const hash = Buffer.from(hashB64, 'base64').toString('utf-8');
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return null;

    const token = await this.jwt.signAsync({ sub: username });
    return { access_token: token };
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
npm exec nx test api -- --testPathPattern=auth.service.spec 2>&1 | tail -10
```

Expected: `Tests: 4 passed`.

- [ ] **Step 7: Generate new hash + update .env**

Run in the project root (`eling/`):

```bash
node -e "const b=require('bcryptjs'); b.hash('YOUR_REAL_PASSWORD', 12).then(h => { console.log('base64:', Buffer.from(h).toString('base64')); })"
```

Replace `YOUR_REAL_PASSWORD` with your actual password. Copy the printed base64 string.

Then open `.env` and replace the `AUTH_PASSWORD_HASH` line:

```
AUTH_PASSWORD_HASH=<paste base64 string here — no quotes, no $ signs>
```

Example (this is a placeholder — generate your own):
```
AUTH_PASSWORD_HASH=JDJiJDEyJHhleGFtcGxlc2FsdGhlcmUuLi50aGlzaXNub3RyZWFs
```

- [ ] **Step 8: Smoke-test login**

```bash
# Start api in one terminal: npm exec nx serve api
# Then in another:
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_REAL_PASSWORD"}' | head -c 200
```

Expected: `{"access_token":"eyJ..."}`.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/app/auth/auth.service.ts apps/api/src/app/auth/auth.service.spec.ts package.json package-lock.json .env
git commit -m "fix(auth): replace argon2 with bcryptjs, store hash base64 to fix dotenv \$ parsing"
```

---

### Task 2: Export JSON

**Goal:** User clicks "Export JSON" → browser downloads all items (including done) as a `.json` file.

**Files:**
- Modify: `apps/web/src/app/core/item.service.ts`
- Modify: `apps/web/src/app/app.ts`

- [ ] **Step 1: Add downloadExport() to ItemService**

Append the following method to `apps/web/src/app/core/item.service.ts` inside the `ItemService` class (before the closing `}`):

```ts
  async downloadExport(): Promise<void> {
    const raw = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>('/api/items')
    );
    const items = raw.map(toItem);
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eling-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
```

- [ ] **Step 2: Add export button to app shell**

Replace `apps/web/src/app/app.ts` with the following (adds export button next to logout):

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ItemService } from './core/item.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-dvh bg-bg text-text font-sans">
      @if (auth.isLoggedIn()) {
        <header class="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between max-w-xl mx-auto w-full">
          <a routerLink="/" class="font-medium text-base hover:opacity-80">Eling</a>
          <div class="flex items-center gap-4">
            <a routerLink="/search" class="text-sm text-muted hover:text-text" aria-label="Cari">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </a>
            <button (click)="onExport()" class="text-sm text-muted hover:text-text" aria-label="Ekspor JSON">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 12l4 4 4-4M12 4v12"/>
              </svg>
            </button>
            <button (click)="onLogout()" class="text-sm text-muted hover:text-text" aria-label="Logout">Keluar</button>
          </div>
        </header>
      }
      <main class="max-w-xl mx-auto px-4 pb-32 pt-4">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly items = inject(ItemService);

  protected async onExport(): Promise<void> {
    await this.items.downloadExport();
  }

  protected async onLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npm exec nx build web -- --configuration=development 2>&1 | tail -5
```

Expected: no TS errors.

- [ ] **Step 4: Manual smoke test**

Start `npm exec nx serve web` and `npm exec nx serve api`. Log in. Click the download icon in the header. Browser should download `eling-export-YYYY-MM-DD.json`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/core/item.service.ts apps/web/src/app/app.ts
git commit -m "feat(p4): export all items as JSON download"
```

---

### Task 3: Transloco setup

**Goal:** Install and configure `@jsverse/transloco` for Angular 21. Create Indonesian and English translation files.

**Files:**
- Modify: `package.json` (install)
- Modify: `apps/web/src/app/app.config.ts`
- Create: `apps/web/src/assets/i18n/id.json`
- Create: `apps/web/src/assets/i18n/en.json`

- [ ] **Step 1: Check Transloco Angular 21 compatibility via docs**

```bash
npm exec nx -- --version 2>&1 | head -2
node -e "require('@angular/core/package.json') && console.log(require('@angular/core/package.json').version)"
```

Note the Angular version, then install the matching Transloco version:
- Angular 18-19 → `@jsverse/transloco@^7`
- Angular 20-21 → `@jsverse/transloco@^8` (check npm for latest)

```bash
npm install @jsverse/transloco@latest 2>&1 | tail -5
```

Expected: installs without peer dependency errors. If peer dep error, install the version specified.

- [ ] **Step 2: Create assets/i18n directory and id.json**

```bash
mkdir -p apps/web/src/assets/i18n
```

Create `apps/web/src/assets/i18n/id.json`:

```json
{
  "app": {
    "searchAriaLabel": "Cari",
    "logout": "Keluar",
    "exportAriaLabel": "Ekspor JSON",
    "langToggle": "EN"
  },
  "login": {
    "title": "Eling",
    "usernameLabel": "Username",
    "passwordLabel": "Password",
    "submit": "Masuk",
    "loading": "Masuk...",
    "error": "Username atau password salah."
  },
  "feed": {
    "loading": "Memuat...",
    "empty": "Kosong — kepalamu lega.",
    "openCount_one": "{{ count }} loop terbuka",
    "openCount_other": "{{ count }} loop terbuka"
  },
  "capture": {
    "placeholder": "Apa yang ada di kepalamu?",
    "captureAriaLabel": "Tangkap",
    "loopLabel": "○ loop",
    "noteLabel": "· note"
  },
  "context": {
    "kerja": "kerja",
    "pribadi": "pribadi",
    "other": "other"
  },
  "loopDetail": {
    "backAriaLabel": "Kembali",
    "nextStepLabel": "Next step",
    "nextStepPlaceholder": "Langkah berikutnya...",
    "save": "Simpan",
    "statusLabel": "Status",
    "markDone": "✓ Tandai selesai",
    "blocked": "Blocked / menunggu",
    "waiting": "Menunggu diskusi",
    "reopen": "Buka kembali",
    "blockedReasonLabel": "Alasan blocked",
    "blockedReasonPlaceholder": "Kenapa blocked?",
    "notFound": "Loop tidak ditemukan."
  },
  "search": {
    "placeholder": "Cari di semua riwayat...",
    "noResults": "Tidak ada hasil untuk \"{{ query }}\""
  }
}
```

- [ ] **Step 3: Create en.json**

Create `apps/web/src/assets/i18n/en.json`:

```json
{
  "app": {
    "searchAriaLabel": "Search",
    "logout": "Logout",
    "exportAriaLabel": "Export JSON",
    "langToggle": "ID"
  },
  "login": {
    "title": "Eling",
    "usernameLabel": "Username",
    "passwordLabel": "Password",
    "submit": "Sign in",
    "loading": "Signing in...",
    "error": "Wrong username or password."
  },
  "feed": {
    "loading": "Loading...",
    "empty": "Empty — your head is clear.",
    "openCount_one": "{{ count }} open loop",
    "openCount_other": "{{ count }} open loops"
  },
  "capture": {
    "placeholder": "What's on your mind?",
    "captureAriaLabel": "Capture",
    "loopLabel": "○ loop",
    "noteLabel": "· note"
  },
  "context": {
    "kerja": "work",
    "pribadi": "personal",
    "other": "other"
  },
  "loopDetail": {
    "backAriaLabel": "Back",
    "nextStepLabel": "Next step",
    "nextStepPlaceholder": "Next action...",
    "save": "Save",
    "statusLabel": "Status",
    "markDone": "✓ Mark done",
    "blocked": "Blocked / waiting",
    "waiting": "Waiting on discussion",
    "reopen": "Reopen",
    "blockedReasonLabel": "Blocked reason",
    "blockedReasonPlaceholder": "Why is it blocked?",
    "notFound": "Loop not found."
  },
  "search": {
    "placeholder": "Search all history...",
    "noResults": "No results for \"{{ query }}\""
  }
}
```

- [ ] **Step 4: Configure Transloco in app.config.ts**

Replace `apps/web/src/app/app.config.ts`:

```ts
import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '@jsverse/transloco';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['id', 'en'],
        defaultLang: 'id',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
```

- [ ] **Step 5: Verify build**

```bash
npm exec nx build web -- --configuration=development 2>&1 | tail -10
```

Expected: builds without errors. If `TranslocoHttpLoader` import path differs, check `@jsverse/transloco` exports: `import { TranslocoHttpLoader } from '@jsverse/transloco/http-loader'` for some versions.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/app.config.ts apps/web/src/assets/i18n/id.json apps/web/src/assets/i18n/en.json package.json package-lock.json
git commit -m "feat(p4): add Transloco i18n — ID and EN translation files"
```

---

### Task 4: Translate all UI strings

**Goal:** Replace every hardcoded Indonesian string in all 5 templates with the transloco pipe. Each component imports `TranslocoModule`.

**Note:** The transloco pipe (`'key' | transloco`) requires `TranslocoModule` (or `TranslocoPipe`) in the component's `imports` array. Add it to all 5 feature components + `app.ts`.

**Files (all modify):**
- `apps/web/src/app/features/login/login.component.ts` + `.html`
- `apps/web/src/app/features/feed/feed.component.ts` + `.html`
- `apps/web/src/app/features/capture/capture-bar.component.ts` + `.html`
- `apps/web/src/app/features/loop-detail/loop-detail.component.ts` + `.html`
- `apps/web/src/app/features/search/search.component.ts` + `.html`
- `apps/web/src/app/app.ts`

- [ ] **Step 1: Update login.component.ts**

Add `TranslocoModule` to imports:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected username = signal('');
  protected password = signal('');
  protected error = signal('');
  protected loading = signal(false);

  protected async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login(this.username(), this.password());
      await this.router.navigate(['/']);
    } catch {
      this.error.set('login.error');
    } finally {
      this.loading.set(false);
    }
  }
}
```

**Note:** error key is now `'login.error'` — the template will pipe it through transloco.

- [ ] **Step 2: Update login.component.html**

Replace `apps/web/src/app/features/login/login.component.html`:

```html
<div class="min-h-dvh bg-bg flex items-center justify-center px-4">
  <div class="w-full max-w-sm bg-surface rounded-lg border border-border p-8 space-y-6">
    <h1 class="text-xl font-medium text-text">{{ 'login.title' | transloco }}</h1>

    @if (error()) {
      <p class="text-sm text-loop">{{ error() | transloco }}</p>
    }

    <form (ngSubmit)="submit()" class="space-y-4">
      <div class="space-y-1">
        <label class="text-sm text-muted" for="username">{{ 'login.usernameLabel' | transloco }}</label>
        <input
          id="username"
          type="text"
          [ngModel]="username()"
          (ngModelChange)="username.set($event)"
          name="username"
          autocomplete="username"
          class="w-full border border-border rounded px-3 py-2 text-text bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-loop"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm text-muted" for="password">{{ 'login.passwordLabel' | transloco }}</label>
        <input
          id="password"
          type="password"
          [ngModel]="password()"
          (ngModelChange)="password.set($event)"
          name="password"
          autocomplete="current-password"
          class="w-full border border-border rounded px-3 py-2 text-text bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-loop"
        />
      </div>

      <button
        type="submit"
        [disabled]="loading()"
        class="w-full bg-loop text-white rounded py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {{ (loading() ? 'login.loading' : 'login.submit') | transloco }}
      </button>
    </form>
  </div>
</div>
```

- [ ] **Step 3: Update feed.component.ts**

Add `TranslocoModule` to imports:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { orderFeed } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ItemRowComponent } from './item-row.component';
import { CaptureBarComponent } from '../capture/capture-bar.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemRowComponent, CaptureBarComponent, TranslocoModule],
  templateUrl: './feed.component.html',
})
export class FeedComponent implements OnInit {
  protected readonly itemService = inject(ItemService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly orderedItems = computed(() => orderFeed(this.itemService.items()));

  protected get openCount(): number {
    return this.itemService.items().filter((i) => i.type === 'loop' && i.status === 'open').length;
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.itemService.loadAll();
    } finally {
      this.loading.set(false);
    }
  }

  protected async onOpen(item: Item): Promise<void> {
    if (item.type === 'loop') {
      await this.router.navigate(['/loop', item.id]);
    }
  }
}
```

- [ ] **Step 4: Update feed.component.html**

Replace `apps/web/src/app/features/feed/feed.component.html`:

```html
@if (loading()) {
  <div class="flex justify-center py-12">
    <span class="text-sm text-muted">{{ 'feed.loading' | transloco }}</span>
  </div>
} @else {
  <div class="space-y-0 divide-y divide-border">
    @if (orderedItems().length === 0) {
      <div class="py-16 text-center">
        <p class="text-muted text-sm">{{ 'feed.empty' | transloco }}</p>
      </div>
    } @else {
      <div class="py-2 px-1">
        <p class="text-xs text-faint">
          {{ 'feed.openCount_other' | transloco: { count: openCount } }}
        </p>
      </div>

      @for (item of orderedItems(); track item.id) {
        <app-item-row [item]="item" (open)="onOpen($event)" />
      }
    }
  </div>
}

<app-capture-bar />
```

- [ ] **Step 5: Update capture-bar.component.ts**

Add `TranslocoModule`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import type { Context, ItemType } from '@eling/shared';
import { ItemService } from '../../core/item.service';
```

Find the existing `capture-bar.component.ts` and add `TranslocoModule` to the `imports` array. The file structure is already there — just add `TranslocoModule` to imports and add `import { TranslocoModule } from '@jsverse/transloco';` at the top.

Read `apps/web/src/app/features/capture/capture-bar.component.ts` first, then add the import.

- [ ] **Step 6: Update capture-bar.component.html**

Replace `apps/web/src/app/features/capture/capture-bar.component.html`:

```html
<div class="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-3 z-20">
  <div class="max-w-xl mx-auto space-y-2">
    <div class="flex gap-2">
      @for (ctx of contexts; track ctx) {
        <button
          type="button"
          (click)="context.set(ctx)"
          class="text-xs px-2 py-0.5 rounded-full border transition-colors"
          [class.border-ctx-kerja]="ctx === 'kerja' && context() === ctx"
          [class.text-ctx-kerja]="ctx === 'kerja' && context() === ctx"
          [class.border-ctx-pribadi]="ctx === 'pribadi' && context() === ctx"
          [class.text-ctx-pribadi]="ctx === 'pribadi' && context() === ctx"
          [class.border-ctx-other]="ctx === 'other' && context() === ctx"
          [class.text-ctx-other]="ctx === 'other' && context() === ctx"
          [class.border-border]="context() !== ctx"
          [class.text-muted]="context() !== ctx"
        >{{ ('context.' + ctx) | transloco }}</button>
      }
      <button
        type="button"
        (click)="toggleType()"
        class="ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors"
        [class.border-loop]="type() === 'loop'"
        [class.text-loop]="type() === 'loop'"
        [class.border-muted]="type() === 'note'"
        [class.text-muted]="type() === 'note'"
      >{{ (type() === 'loop' ? 'capture.loopLabel' : 'capture.noteLabel') | transloco }}</button>
    </div>

    <form (ngSubmit)="onSubmit()" class="flex gap-2">
      <input
        data-testid="capture-input"
        type="text"
        [value]="text()"
        (input)="text.set($any($event.target).value)"
        [placeholder]="'capture.placeholder' | transloco"
        autocomplete="off"
        class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-loop min-h-[44px]"
      />
      <button
        type="submit"
        [disabled]="!text().trim()"
        [attr.aria-label]="'capture.captureAriaLabel' | transloco"
        class="w-11 h-11 flex items-center justify-center rounded-lg bg-loop text-white disabled:opacity-40 hover:opacity-90"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </form>
  </div>
</div>
```

- [ ] **Step 7: Update loop-detail.component.ts**

Read `apps/web/src/app/features/loop-detail/loop-detail.component.ts`. Add `TranslocoModule` to imports array and add the import statement at the top.

- [ ] **Step 8: Update loop-detail.component.html**

Replace `apps/web/src/app/features/loop-detail/loop-detail.component.html`:

```html
@if (item(); as loop) {
  <div class="space-y-6 py-4">
    <div class="flex items-start gap-3">
      <button (click)="goBack()" [attr.aria-label]="'loopDetail.backAriaLabel' | transloco" class="text-muted hover:text-text mt-0.5">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <p class="text-base font-medium text-text leading-snug">{{ loop.text }}</p>
    </div>

    <div class="space-y-1">
      <label class="text-xs text-muted uppercase tracking-wide">{{ 'loopDetail.nextStepLabel' | transloco }}</label>
      <div class="flex gap-2">
        <input
          type="text"
          [ngModel]="nextStep()"
          (ngModelChange)="nextStep.set($event)"
          name="nextStep"
          [placeholder]="'loopDetail.nextStepPlaceholder' | transloco"
          class="flex-1 border border-border rounded px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-1 focus:ring-loop"
        />
        <button
          type="button"
          (click)="saveNextStep()"
          class="px-3 py-2 text-sm bg-surface border border-border rounded hover:bg-gray-50 text-muted"
        >{{ 'loopDetail.save' | transloco }}</button>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted uppercase tracking-wide">{{ 'loopDetail.statusLabel' | transloco }}</p>
      <div class="flex flex-col gap-2">
        <button
          data-testid="btn-done"
          type="button"
          (click)="markStatus('done')"
          class="w-full py-2.5 rounded-lg border border-done text-done text-sm font-medium hover:bg-green-50"
        >{{ 'loopDetail.markDone' | transloco }}</button>

        <button
          data-testid="btn-blocked"
          type="button"
          (click)="markStatus('blocked')"
          class="w-full py-2.5 rounded-lg border border-border text-muted text-sm hover:bg-gray-50"
        >{{ 'loopDetail.blocked' | transloco }}</button>

        <button
          data-testid="btn-waiting"
          type="button"
          (click)="markStatus('waiting')"
          class="w-full py-2.5 rounded-lg border border-border text-muted text-sm hover:bg-gray-50"
        >{{ 'loopDetail.waiting' | transloco }}</button>

        <button
          data-testid="btn-open"
          type="button"
          (click)="markStatus('open')"
          class="w-full py-2.5 rounded-lg border border-border text-muted text-sm hover:bg-gray-50"
        >{{ 'loopDetail.reopen' | transloco }}</button>
      </div>
    </div>

    @if (loop.status === 'blocked' || loop.status === 'waiting') {
      <div class="space-y-1">
        <label class="text-xs text-muted uppercase tracking-wide">{{ 'loopDetail.blockedReasonLabel' | transloco }}</label>
        <input
          type="text"
          [ngModel]="blockedReason()"
          (ngModelChange)="blockedReason.set($event)"
          name="blockedReason"
          [placeholder]="'loopDetail.blockedReasonPlaceholder' | transloco"
          class="w-full border border-border rounded px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-1 focus:ring-loop"
        />
      </div>
    }
  </div>
} @else {
  <p class="text-muted text-sm py-8">{{ 'loopDetail.notFound' | transloco }}</p>
}
```

- [ ] **Step 9: Update search.component.ts**

Read `apps/web/src/app/features/search/search.component.ts`. Add `TranslocoModule` to imports array and add the import at the top.

- [ ] **Step 10: Update search.component.html**

Replace `apps/web/src/app/features/search/search.component.html`:

```html
<div class="space-y-4 py-4 pb-8">
  <input
    data-testid="search-input"
    type="search"
    [value]="query()"
    (input)="onInput($any($event.target).value)"
    [placeholder]="'search.placeholder' | transloco"
    autocomplete="off"
    class="w-full border border-border rounded-lg px-4 py-3 text-sm text-text bg-surface placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-loop"
  />

  @if (searched() && results().length === 0) {
    <p class="text-center text-sm text-muted py-8">
      {{ 'search.noResults' | transloco: { query: query() } }}
    </p>
  }

  @if (results().length > 0) {
    <div class="divide-y divide-border">
      @for (item of results(); track item.id) {
        <app-item-row [item]="item" (open)="onOpen($event)" />
      }
    </div>
  }
</div>
```

- [ ] **Step 11: Verify build — no errors**

```bash
npm exec nx build web -- --configuration=development 2>&1 | tail -10
```

Expected: no TS errors, no missing pipe errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/app/features/
git commit -m "feat(p4): translate all UI strings via Transloco pipe"
```

---

### Task 5: Language toggle + localStorage persistence

**Goal:** Add ID/EN toggle button in header. On click, switch active language and persist in localStorage. On app init, restore from localStorage.

**Files:**
- Modify: `apps/web/src/app/app.ts`

- [ ] **Step 1: Update app.ts with language toggle**

Replace `apps/web/src/app/app.ts`:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from './core/auth.service';
import { ItemService } from './core/item.service';

const LANG_KEY = 'eling-lang';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, TranslocoModule],
  template: `
    <div class="min-h-dvh bg-bg text-text font-sans">
      @if (auth.isLoggedIn()) {
        <header class="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between max-w-xl mx-auto w-full">
          <a routerLink="/" class="font-medium text-base hover:opacity-80">Eling</a>
          <div class="flex items-center gap-3">
            <a routerLink="/search" class="text-sm text-muted hover:text-text" [attr.aria-label]="'app.searchAriaLabel' | transloco">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </a>
            <button (click)="onExport()" class="text-sm text-muted hover:text-text" [attr.aria-label]="'app.exportAriaLabel' | transloco">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 12l4 4 4-4M12 4v12"/>
              </svg>
            </button>
            <button (click)="toggleLang()" class="text-xs font-mono text-muted hover:text-text border border-border rounded px-1.5 py-0.5">
              {{ 'app.langToggle' | transloco }}
            </button>
            <button (click)="onLogout()" class="text-sm text-muted hover:text-text">{{ 'app.logout' | transloco }}</button>
          </div>
        </header>
      }
      <main class="max-w-xl mx-auto px-4 pb-32 pt-4">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly items = inject(ItemService);
  private readonly transloco = inject(TranslocoService);

  protected readonly lang = signal<string>('id');

  ngOnInit(): void {
    const saved = localStorage.getItem(LANG_KEY) ?? 'id';
    this.lang.set(saved);
    this.transloco.setActiveLang(saved);
  }

  protected toggleLang(): void {
    const next = this.lang() === 'id' ? 'en' : 'id';
    this.lang.set(next);
    this.transloco.setActiveLang(next);
    localStorage.setItem(LANG_KEY, next);
  }

  protected async onExport(): Promise<void> {
    await this.items.downloadExport();
  }

  protected async onLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
```

**Note on `app.langToggle`:** value is `'EN'` in id.json (shows current opposite to switch to) and `'ID'` in en.json. So when language is ID, button shows "EN" (click to switch to EN), and vice versa.

- [ ] **Step 2: Verify build**

```bash
npm exec nx build web -- --configuration=development 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 3: Manual test**

Start both servers. Log in. Click "EN" toggle. All UI text switches to English. Reload page — should stay English (localStorage persists). Click "ID" — switches back.

- [ ] **Step 4: Run all frontend tests**

```bash
npm exec nx test web 2>&1 | tail -15
```

Expected: all tests pass (existing tests may need `TranslocoTestingModule` if they test translated templates — fix if needed).

**If tests fail due to missing Transloco provider**, add this to failing spec files' `TestBed.configureTestingModule`:

```ts
import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import idTranslations from '../../../../assets/i18n/id.json';

const translocoOptions: TranslocoTestingOptions = {
  langs: { id: idTranslations },
  translocoConfig: { defaultLang: 'id' },
  preloadLangs: true,
};

// In TestBed:
imports: [TranslocoTestingModule.forRoot(translocoOptions), ...]
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app.ts
git commit -m "feat(p4): language toggle ID/EN with localStorage persistence"
```

---

### Task 6: Docker deployment

**Goal:** Containerize the full stack. Postgres + NestJS API + Angular/nginx + Caddy (automatic HTTPS). Run on VPS with `docker compose up -d`.

**Files:**
- Create: `.dockerignore`
- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `apps/web/nginx.conf`
- Create: `docker-compose.yml`
- Create: `Caddyfile`
- Create: `.env.production.example`

- [ ] **Step 1: Check API main.ts for CORS + bootstrap**

Read `apps/api/src/main.ts`. Verify it sets `app.enableCors({ origin: process.env['CORS_ORIGIN'] })`. If CORS_ORIGIN is hardcoded or missing, update it to read from env.

Expected to already have: `app.enableCors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200' })`.

- [ ] **Step 2: Create .dockerignore**

Create `.dockerignore` in the workspace root (`eling/`):

```
node_modules
dist
.angular
.nx
tmp
*.log
.env
.env.*
!.env.production.example
.git
coverage
```

- [ ] **Step 3: Create apps/api/Dockerfile**

Create `apps/api/Dockerfile`:

```dockerfile
# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm exec nx build api -- --configuration=production

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node main.js"]
```

- [ ] **Step 4: Create apps/web/nginx.conf**

Create `apps/web/nginx.conf`:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
  gzip_min_length 1000;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Step 5: Create apps/web/Dockerfile**

Create `apps/web/Dockerfile`:

```dockerfile
# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm exec nx build web -- --configuration=production

# ---- runner ----
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist/apps/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

- [ ] **Step 6: Create Caddyfile**

Create `Caddyfile` in workspace root (`eling/`):

```
{$DOMAIN} {
  handle /api/* {
    reverse_proxy api:3000
  }

  handle {
    reverse_proxy web:80
  }
}
```

Caddy automatically obtains and renews Let's Encrypt certificates when `{$DOMAIN}` is a real domain (not localhost). On localhost, it uses a self-signed cert.

- [ ] **Step 7: Create docker-compose.yml**

Create `docker-compose.yml` in workspace root (`eling/`):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: eling
      POSTGRES_USER: eling
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eling"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: always
    environment:
      DATABASE_URL: postgresql://eling:${POSTGRES_PASSWORD}@postgres:5432/eling
      AUTH_USERNAME: ${AUTH_USERNAME}
      AUTH_PASSWORD_HASH: ${AUTH_PASSWORD_HASH}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://${DOMAIN}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: always
    networks:
      - internal

  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      DOMAIN: ${DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api
      - web
    networks:
      - internal

volumes:
  pgdata:
  caddy_data:
  caddy_config:

networks:
  internal:
```

- [ ] **Step 8: Create .env.production.example**

Create `.env.production.example` in workspace root (`eling/`):

```bash
# Copy to .env on the VPS and fill in real values.
# Never commit .env to git.

DOMAIN=eling.yourdomain.com
POSTGRES_PASSWORD=changeme_strongpassword
AUTH_USERNAME=yourUsername
# Generate with: node -e "const b=require('bcryptjs'); b.hash('yourPassword',12).then(h=>console.log(Buffer.from(h).toString('base64')))"
AUTH_PASSWORD_HASH=base64encodedBcryptHash
# Generate with: node -c "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=64charRandomHex
```

- [ ] **Step 9: Local Docker smoke test (optional, needs Docker)**

```bash
# From eling/ directory:
cp .env.production.example .env.docker-test
# Edit .env.docker-test with DOMAIN=localhost, fill in test creds
docker compose --env-file .env.docker-test build 2>&1 | tail -20
```

Expected: builds api and web images without errors.

- [ ] **Step 10: Commit**

```bash
git add .dockerignore apps/api/Dockerfile apps/web/Dockerfile apps/web/nginx.conf docker-compose.yml Caddyfile .env.production.example
git commit -m "feat(p4): Docker setup — multistage builds, Caddy TLS, docker-compose"
```

---

### Task 7: DB backup script

**Goal:** Daily automated `pg_dump` with 7-day rotation. Run from a host cron job targeting the running postgres container.

**Files:**
- Create: `scripts/backup.sh`

- [ ] **Step 1: Create scripts directory and backup.sh**

```bash
mkdir -p scripts
```

Create `scripts/backup.sh`:

```bash
#!/bin/sh
# Daily Postgres backup for Eling.
# Run from the host where Docker is running.
# Assumes the compose project is named "eling" (default = directory name).

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/eling}"
CONTAINER="${CONTAINER:-eling-postgres-1}"
DB_USER="${DB_USER:-eling}"
DB_NAME="${DB_NAME:-eling}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
OUTFILE="$BACKUP_DIR/eling-$DATE.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUTFILE"

echo "Backup written: $OUTFILE"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "eling-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "Pruned backups older than $KEEP_DAYS days"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/backup.sh
```

- [ ] **Step 3: Set up host cron (manual step on VPS)**

On the VPS, after deploying, run:

```bash
crontab -e
```

Add this line (daily at 02:00):

```
0 2 * * * /path/to/eling/scripts/backup.sh >> /var/log/eling-backup.log 2>&1
```

Replace `/path/to/eling/` with the actual deploy directory (e.g., `/home/ubuntu/eling`).

To restore from a backup:
```bash
gunzip -c /var/backups/eling/eling-YYYY-MM-DD_HH-MM-SS.sql.gz | docker exec -i eling-postgres-1 psql -U eling eling
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backup.sh
git commit -m "feat(p4): daily pg_dump backup script with 7-day rotation"
```

---

## Self-review

**Spec coverage check against TRD §19 (Definition of Done):**

| DoD requirement | Task |
|---|---|
| Capture + optimistic UI | P3 ✓ |
| Feed + correct ordering | P3 ✓ |
| Loop: next step, blocked/waiting, mark done | P3 ✓ |
| Search keyword | P3 ✓ |
| Export JSON | Task 2 ✓ |
| Backup DB harian | Task 7 ✓ |
| Auth single-user + HTTPS | Task 1 (fix) + Task 6 (Docker/Caddy) ✓ |
| Unit tests logika inti hijau | P2/P3 ✓ (no new logic in P4 needing new tests) |
| Bundle dalam budget | P3 (budget already configured) ✓ |
| Toggle bahasa ID/EN | Tasks 3, 4, 5 ✓ |

**Placeholder scan:** No TBD/TODO in code blocks. All commands have expected output. All file paths are exact.

**Type consistency:** `TranslocoModule` and `TranslocoService` from `@jsverse/transloco` — consistent across all tasks. `bcryptjs` import as `import * as bcrypt from 'bcryptjs'` — consistent in service and spec.

**Potential issue:** Transloco import path for `TranslocoHttpLoader` may vary by version:
- v7: `import { TranslocoHttpLoader } from '@jsverse/transloco'`
- Some versions: `import { TranslocoHttpLoader } from '@jsverse/transloco/http-loader'`

Task 3 Step 5 already flags this — verify during install and adjust if needed.
