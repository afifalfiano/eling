# P3 Angular Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Angular SPA — login, feed, capture, loop-detail, search — wired to the P2 API.

**Architecture:** Standalone components + signals. `ItemService` owns all HTTP + state. Optimistic capture via `signal()` + rollback on error. No NgModule, no NgRx, no heavy libs.

**Tech Stack:** Angular 21, Tailwind CSS 4, `@angular/cdk` (overlay), `HttpClient`, `provideZonelessChangeDetection`, Vitest globals (via `@angular/build:unit-test`).

**Out of scope (P4):** Transloco i18n, dark mode, Export JSON, Docker deploy.

---

### Task 1: Design tokens + Tailwind wiring

**Files:**
- Modify: `apps/web/tailwind.config.js`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Extend tailwind.config.js with design tokens**

Replace `apps/web/tailwind.config.js`:

```js
module.exports = {
  content: ['./apps/web/src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF8',
        surface: '#FFFFFF',
        text: '#1F1E1C',
        muted: '#6B6760',
        faint: '#9A9588',
        border: '#E7E3DA',
        loop: '#D85A30',
        done: '#3B6D11',
        'ctx-kerja': '#378ADD',
        'ctx-pribadi': '#BA7517',
        'ctx-other': '#888780',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Update styles.css to use Tailwind v4**

Replace `apps/web/src/styles.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 3: Verify build compiles**

```bash
npm exec nx build web -- --configuration=development 2>&1 | tail -5
```
Expected: `✓ Building...` or similar, no error.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tailwind.config.js apps/web/src/styles.css
git commit -m "feat(p3): wire design tokens into Tailwind config"
```

---

### Task 2: Auth flow — LoginComponent + AuthService + guard + interceptor

**Files:**
- Create: `apps/web/src/app/core/auth.service.ts`
- Create: `apps/web/src/app/core/auth.guard.ts`
- Create: `apps/web/src/app/core/auth.interceptor.ts`
- Create: `apps/web/src/app/features/login/login.component.ts`
- Create: `apps/web/src/app/features/login/login.component.html`
- Create: `apps/web/src/app/core/auth.service.spec.ts`
- Modify: `apps/web/src/app/app.config.ts`
- Modify: `apps/web/src/app/app.routes.ts`

- [ ] **Step 1: Write AuthService spec (TDD)**

Create `apps/web/src/app/core/auth.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('isLoggedIn false when no token', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('login stores token and sets isLoggedIn true', async () => {
    const promise = service.login('admin', 'pass');
    http.expectOne('/api/auth/login').flush({ access_token: 'tok123' });
    await promise;
    expect(service.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('eling_token')).toBe('tok123');
  });

  it('logout clears token', async () => {
    const promise = service.login('admin', 'pass');
    http.expectOne('/api/auth/login').flush({ access_token: 'tok123' });
    await promise;
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
  });
});
```

- [ ] **Step 2: Run spec — expect fail**

```bash
npm exec nx test web -- --testPathPattern=auth.service.spec 2>&1 | tail -10
```
Expected: FAIL (AuthService not found).

- [ ] **Step 3: Implement AuthService**

Create `apps/web/src/app/core/auth.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const TOKEN_KEY = 'eling_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _isLoggedIn = signal(!!localStorage.getItem(TOKEN_KEY));

  isLoggedIn = this._isLoggedIn.asReadonly();

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ access_token: string }>('/api/auth/login', { username, password })
    );
    localStorage.setItem(TOKEN_KEY, res.access_token);
    this._isLoggedIn.set(true);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._isLoggedIn.set(false);
  }
}
```

- [ ] **Step 4: Run spec — expect pass**

```bash
npm exec nx test web -- --testPathPattern=auth.service.spec 2>&1 | tail -5
```
Expected: PASS (3 tests).

- [ ] **Step 5: Create auth guard**

Create `apps/web/src/app/core/auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};
```

- [ ] **Step 6: Create auth interceptor**

Create `apps/web/src/app/core/auth.interceptor.ts`:

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

- [ ] **Step 7: Create LoginComponent**

Create `apps/web/src/app/features/login/login.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
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
      this.error.set('Username atau password salah.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

Create `apps/web/src/app/features/login/login.component.html`:

```html
<div class="min-h-dvh bg-bg flex items-center justify-center px-4">
  <div class="w-full max-w-sm bg-surface rounded-lg border border-border p-8 space-y-6">
    <h1 class="text-xl font-medium text-text">Eling</h1>

    @if (error()) {
      <p class="text-sm text-loop">{{ error() }}</p>
    }

    <form (ngSubmit)="submit()" class="space-y-4">
      <div class="space-y-1">
        <label class="text-sm text-muted" for="username">Username</label>
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
        <label class="text-sm text-muted" for="password">Password</label>
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
        {{ loading() ? 'Masuk...' : 'Masuk' }}
      </button>
    </form>
  </div>
</div>
```

- [ ] **Step 8: Wire routes + providers in app.config.ts**

Replace `apps/web/src/app/app.routes.ts`:

```ts
import { Route } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/feed/feed.component').then((m) => m.FeedComponent),
  },
  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
  },
  { path: '**', redirectTo: '' },
];
```

Replace `apps/web/src/app/app.config.ts`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

- [ ] **Step 9: Run all web tests**

```bash
npm exec nx test web 2>&1 | tail -10
```
Expected: all tests pass (ignore the existing `app.spec.ts` — it will be fixed in Task 4).

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/core/ apps/web/src/app/features/login/ apps/web/src/app/app.config.ts apps/web/src/app/app.routes.ts
git commit -m "feat(p3): auth flow — LoginComponent, AuthService, guard, interceptor"
```

---

### Task 3: ItemService — HTTP + signals + optimistic update

**Files:**
- Create: `apps/web/src/app/core/item.service.ts`
- Create: `apps/web/src/app/core/item.service.spec.ts`

- [ ] **Step 1: Write ItemService spec (TDD)**

Create `apps/web/src/app/core/item.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Item } from '@eling/shared';
import { ItemService } from './item.service';

const mockItem = (overrides: Partial<Item> = {}): Item => ({
  id: '1',
  type: 'loop',
  text: 'test',
  context: 'kerja',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  status: 'open',
  ...overrides,
});

describe('ItemService', () => {
  let service: ItemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ItemService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('items() starts empty', () => {
    expect(service.items()).toEqual([]);
  });

  it('loadAll() populates items signal', async () => {
    const promise = service.loadAll();
    http.expectOne('/api/items').flush([mockItem()]);
    await promise;
    expect(service.items().length).toBe(1);
    expect(service.items()[0].id).toBe('1');
  });

  it('create() optimistically adds item then confirms', async () => {
    const promise = service.create({ text: 'hello', type: 'loop', context: 'kerja' });
    // optimistic: item added before response
    expect(service.items().length).toBe(1);
    expect(service.items()[0].text).toBe('hello');
    http.expectOne('/api/items').flush(mockItem({ id: 'server-id', text: 'hello' }));
    await promise;
    // replaced with server response
    expect(service.items()[0].id).toBe('server-id');
  });

  it('create() rolls back on error', async () => {
    const promise = service.create({ text: 'fail', type: 'loop', context: 'kerja' });
    expect(service.items().length).toBe(1);
    http.expectOne('/api/items').error(new ProgressEvent('error'));
    await promise.catch(() => null);
    expect(service.items().length).toBe(0);
  });

  it('update() patches item in signal', async () => {
    // seed
    const load = service.loadAll();
    http.expectOne('/api/items').flush([mockItem()]);
    await load;

    const promise = service.update('1', { status: 'done' });
    http.expectOne('/api/items/1').flush(mockItem({ status: 'done' }));
    await promise;
    expect(service.items()[0].status).toBe('done');
  });

  it('remove() deletes item from signal', async () => {
    const load = service.loadAll();
    http.expectOne('/api/items').flush([mockItem()]);
    await load;

    const promise = service.remove('1');
    http.expectOne('/api/items/1').flush({});
    await promise;
    expect(service.items()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run spec — expect fail**

```bash
npm exec nx test web -- --testPathPattern=item.service.spec 2>&1 | tail -10
```
Expected: FAIL (ItemService not found).

- [ ] **Step 3: Implement ItemService**

Create `apps/web/src/app/core/item.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CreateItemDto, Item, UpdateItemDto } from '@eling/shared';

function toItem(raw: Record<string, unknown>): Item {
  return {
    ...(raw as Item),
    createdAt: new Date(raw['createdAt'] as string),
    updatedAt: new Date(raw['updatedAt'] as string),
    doneAt: raw['doneAt'] ? new Date(raw['doneAt'] as string) : null,
  };
}

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly http = inject(HttpClient);
  private readonly _items = signal<Item[]>([]);

  readonly items = this._items.asReadonly();

  async loadAll(filters?: { status?: string; type?: string; context?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.context) params.set('context', filters.context);
    const qs = params.toString() ? `?${params}` : '';
    const raw = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`/api/items${qs}`)
    );
    this._items.set(raw.map(toItem));
  }

  async create(dto: CreateItemDto): Promise<void> {
    const temp: Item = {
      id: `temp-${Date.now()}`,
      type: dto.type ?? 'loop',
      text: dto.text,
      context: dto.context ?? 'kerja',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: dto.type !== 'note' ? 'open' : undefined,
    };
    this._items.update((prev) => [temp, ...prev]);
    try {
      const raw = await firstValueFrom(
        this.http.post<Record<string, unknown>>('/api/items', dto)
      );
      const confirmed = toItem(raw);
      this._items.update((prev) => prev.map((i) => (i.id === temp.id ? confirmed : i)));
    } catch (err) {
      this._items.update((prev) => prev.filter((i) => i.id !== temp.id));
      throw err;
    }
  }

  async update(id: string, dto: UpdateItemDto): Promise<void> {
    const raw = await firstValueFrom(
      this.http.patch<Record<string, unknown>>(`/api/items/${id}`, dto)
    );
    const updated = toItem(raw);
    this._items.update((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/items/${id}`));
    this._items.update((prev) => prev.filter((i) => i.id !== id));
  }

  async search(q: string): Promise<Item[]> {
    const raw = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`/api/items/search?q=${encodeURIComponent(q)}`)
    );
    return raw.map(toItem);
  }
}
```

- [ ] **Step 4: Run spec — expect pass**

```bash
npm exec nx test web -- --testPathPattern=item.service.spec 2>&1 | tail -10
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/core/item.service.ts apps/web/src/app/core/item.service.spec.ts
git commit -m "feat(p3): ItemService — HTTP + signals + optimistic update (TDD)"
```

---

### Task 4: App shell — AppComponent + layout

**Files:**
- Modify: `apps/web/src/app/app.ts`
- Modify: `apps/web/src/app/app.spec.ts`
- Delete (remove content): `apps/web/src/app/nx-welcome.ts` (if exists)

- [ ] **Step 1: Rewrite AppComponent**

Replace `apps/web/src/app/app.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-dvh bg-bg text-text font-sans">
      @if (auth.isLoggedIn()) {
        <header class="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between max-w-xl mx-auto w-full">
          <span class="font-medium text-base">Eling</span>
          <button
            (click)="onLogout()"
            class="text-sm text-muted hover:text-text"
            aria-label="Logout"
          >Keluar</button>
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

  protected async onLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
```

- [ ] **Step 2: Fix app.spec.ts**

Replace `apps/web/src/app/app.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('renders app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 3: Remove NxWelcome if it exists**

```bash
rm -f /Users/afifalfiano/Documents/projects/eling-project/eling/apps/web/src/app/nx-welcome.ts
```

- [ ] **Step 4: Run tests**

```bash
npm exec nx test web 2>&1 | tail -10
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/app.ts apps/web/src/app/app.spec.ts
git commit -m "feat(p3): app shell — layout, header, logout"
```

---

### Task 5: FeedComponent + ItemRowComponent

**Files:**
- Create: `apps/web/src/app/features/feed/feed.component.ts`
- Create: `apps/web/src/app/features/feed/feed.component.html`
- Create: `apps/web/src/app/features/feed/item-row.component.ts`
- Create: `apps/web/src/app/features/feed/item-row.component.html`
- Create: `apps/web/src/app/features/feed/item-row.component.spec.ts`

- [ ] **Step 1: Write ItemRowComponent spec (TDD)**

Create `apps/web/src/app/features/feed/item-row.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Item } from '@eling/shared';
import { ItemRowComponent } from './item-row.component';

const mkItem = (overrides: Partial<Item> = {}): Item => ({
  id: '1',
  type: 'loop',
  text: 'fix bug',
  context: 'kerja',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'open',
  ...overrides,
});

describe('ItemRowComponent', () => {
  let fixture: ComponentFixture<ItemRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemRowComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ItemRowComponent);
  });

  it('renders loop text', async () => {
    fixture.componentRef.setInput('item', mkItem());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('fix bug');
  });

  it('adds done style when status is done', async () => {
    fixture.componentRef.setInput('item', mkItem({ status: 'done' }));
    await fixture.whenStable();
    const el = fixture.nativeElement.querySelector('[data-testid="item-text"]');
    expect(el?.classList.contains('line-through')).toBe(true);
  });

  it('renders note with dot indicator', async () => {
    fixture.componentRef.setInput('item', mkItem({ type: 'note', status: undefined }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="note-dot"]')).toBeTruthy();
  });

  it('emits open event when row clicked', async () => {
    fixture.componentRef.setInput('item', mkItem());
    await fixture.whenStable();
    let emitted: Item | undefined;
    fixture.componentInstance.open.subscribe((v: Item) => (emitted = v));
    fixture.nativeElement.querySelector('[data-testid="item-row"]').click();
    expect(emitted?.id).toBe('1');
  });
});
```

- [ ] **Step 2: Run spec — expect fail**

```bash
npm exec nx test web -- --testPathPattern=item-row.component.spec 2>&1 | tail -10
```
Expected: FAIL.

- [ ] **Step 3: Implement ItemRowComponent**

Create `apps/web/src/app/features/feed/item-row.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Item } from '@eling/shared';

@Component({
  selector: 'app-item-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-row.component.html',
})
export class ItemRowComponent {
  readonly item = input.required<Item>();
  readonly open = output<Item>();

  protected onClick(): void {
    this.open.emit(this.item());
  }

  protected get isDone(): boolean {
    return this.item().status === 'done';
  }

  protected get contextColor(): string {
    const map: Record<string, string> = {
      kerja: 'text-ctx-kerja bg-blue-50',
      pribadi: 'text-ctx-pribadi bg-amber-50',
      other: 'text-ctx-other bg-gray-50',
    };
    return map[this.item().context] ?? map['other'];
  }
}
```

Create `apps/web/src/app/features/feed/item-row.component.html`:

```html
<div
  data-testid="item-row"
  (click)="onClick()"
  (keyup.enter)="onClick()"
  tabindex="0"
  role="button"
  [attr.aria-label]="item().text"
  class="flex items-start gap-3 py-3 px-1 cursor-pointer hover:bg-gray-50 rounded transition-colors"
  [class.opacity-50]="isDone"
>
  @if (item().type === 'loop') {
    <!-- loop circle checkbox -->
    <div
      class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
      [class.border-loop]="!isDone"
      [class.border-done]="isDone"
      [class.bg-done]="isDone"
    >
      @if (isDone) {
        <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      }
    </div>
  } @else {
    <!-- note dot -->
    <div
      data-testid="note-dot"
      class="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-muted"
    ></div>
  }

  <div class="flex-1 min-w-0">
    <p
      data-testid="item-text"
      class="text-sm text-text leading-snug"
      [class.line-through]="isDone"
      [class.text-muted]="isDone"
    >{{ item().text }}</p>

    @if (item().nextStep) {
      <p class="text-xs text-muted mt-0.5">→ {{ item().nextStep }}</p>
    }

    @if (item().status === 'blocked' || item().status === 'waiting') {
      <p class="text-xs text-faint mt-0.5 italic">
        {{ item().status === 'blocked' ? 'blocked' : 'waiting' }}
        @if (item().blockedReason) { — {{ item().blockedReason }} }
      </p>
    }
  </div>

  <span class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium" [class]="contextColor">
    {{ item().context }}
  </span>
</div>
```

- [ ] **Step 4: Run ItemRow spec — expect pass**

```bash
npm exec nx test web -- --testPathPattern=item-row.component.spec 2>&1 | tail -10
```
Expected: PASS (4 tests).

- [ ] **Step 5: Implement FeedComponent**

Create `apps/web/src/app/features/feed/feed.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { orderFeed } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ItemRowComponent } from './item-row.component';
import { CaptureBarComponent } from '../capture/capture-bar.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemRowComponent, CaptureBarComponent],
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

Create `apps/web/src/app/features/feed/feed.component.html`:

```html
@if (loading()) {
  <div class="flex justify-center py-12">
    <span class="text-sm text-muted">Memuat...</span>
  </div>
} @else {
  <div class="space-y-0 divide-y divide-border">
    @if (orderedItems().length === 0) {
      <div class="py-16 text-center">
        <p class="text-muted text-sm">Kosong — kepalamu lega.</p>
      </div>
    } @else {
      <div class="py-2 px-1">
        <p class="text-xs text-faint">
          {{ openCount }} loop terbuka
        </p>
      </div>

      @for (item of orderedItems(); track item.id) {
        <app-item-row [item]="item" (open)="onOpen($event)" />
      }
    }
  </div>
}

<!-- Capture bar fixed at bottom -->
<app-capture-bar />
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/feed/
git commit -m "feat(p3): FeedComponent + ItemRowComponent (TDD)"
```

---

### Task 6: CaptureBarComponent

**Files:**
- Create: `apps/web/src/app/features/capture/capture-bar.component.ts`
- Create: `apps/web/src/app/features/capture/capture-bar.component.html`
- Create: `apps/web/src/app/features/capture/capture-bar.component.spec.ts`

- [ ] **Step 1: Write CaptureBar spec (TDD)**

Create `apps/web/src/app/features/capture/capture-bar.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CaptureBarComponent } from './capture-bar.component';
import { ItemService } from '../../core/item.service';

describe('CaptureBarComponent', () => {
  let fixture: ComponentFixture<CaptureBarComponent>;
  let itemService: ItemService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaptureBarComponent],
      providers: [ItemService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(CaptureBarComponent);
    itemService = TestBed.inject(ItemService);
    await fixture.whenStable();
  });

  it('renders capture input', () => {
    expect(fixture.nativeElement.querySelector('input[data-testid="capture-input"]')).toBeTruthy();
  });

  it('calls itemService.create on submit', async () => {
    const spy = vi.spyOn(itemService, 'create').mockResolvedValue();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="capture-input"]');
    input.value = 'hello world';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello world' }));
  });

  it('clears input after submit', async () => {
    vi.spyOn(itemService, 'create').mockResolvedValue();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="capture-input"]');
    input.value = 'test';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(fixture.componentInstance['text']()).toBe('');
  });
});
```

- [ ] **Step 2: Run spec — expect fail**

```bash
npm exec nx test web -- --testPathPattern=capture-bar.component.spec 2>&1 | tail -10
```
Expected: FAIL.

- [ ] **Step 3: Implement CaptureBarComponent**

Create `apps/web/src/app/features/capture/capture-bar.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Context, ItemType } from '@eling/shared';
import { ItemService } from '../../core/item.service';

@Component({
  selector: 'app-capture-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-bar.component.html',
})
export class CaptureBarComponent {
  private readonly itemService = inject(ItemService);

  protected readonly text = signal('');
  protected readonly type = signal<ItemType>('loop');
  protected readonly context = signal<Context>('kerja');

  protected readonly contexts: Context[] = ['kerja', 'pribadi', 'other'];

  protected toggleType(): void {
    this.type.set(this.type() === 'loop' ? 'note' : 'loop');
  }

  protected async onSubmit(): Promise<void> {
    const t = this.text().trim();
    if (!t) return;
    this.text.set('');
    await this.itemService.create({ text: t, type: this.type(), context: this.context() });
  }
}
```

Create `apps/web/src/app/features/capture/capture-bar.component.html`:

```html
<div class="fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-3 z-20">
  <div class="max-w-xl mx-auto space-y-2">
    <!-- context chips -->
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
        >{{ ctx }}</button>
      }
      <button
        type="button"
        (click)="toggleType()"
        class="ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors"
        [class.border-loop]="type() === 'loop'"
        [class.text-loop]="type() === 'loop'"
        [class.border-muted]="type() === 'note'"
        [class.text-muted]="type() === 'note'"
      >{{ type() === 'loop' ? '○ loop' : '· note' }}</button>
    </div>

    <!-- input row -->
    <form (ngSubmit)="onSubmit()" class="flex gap-2">
      <input
        data-testid="capture-input"
        type="text"
        [value]="text()"
        (input)="text.set($any($event.target).value)"
        placeholder="Apa yang ada di kepalamu?"
        autocomplete="off"
        class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-loop min-h-[44px]"
      />
      <button
        type="submit"
        [disabled]="!text().trim()"
        aria-label="Tangkap"
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

- [ ] **Step 4: Run spec — expect pass**

```bash
npm exec nx test web -- --testPathPattern=capture-bar.component.spec 2>&1 | tail -10
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/features/capture/
git commit -m "feat(p3): CaptureBarComponent — capture bar with type/context toggle (TDD)"
```

---

### Task 7: LoopDetailComponent — overlay for loop lifecycle

**Files:**
- Create: `apps/web/src/app/features/loop-detail/loop-detail.component.ts`
- Create: `apps/web/src/app/features/loop-detail/loop-detail.component.html`
- Create: `apps/web/src/app/features/loop-detail/loop-detail.component.spec.ts`
- Modify: `apps/web/src/app/app.routes.ts` (add /loop/:id route)
- Check: `@angular/cdk` overlay installed

- [ ] **Step 1: Check CDK installed**

```bash
grep "@angular/cdk" /Users/afifalfiano/Documents/projects/eling-project/eling/package.json
```
If missing, install: `npm install @angular/cdk` (ask user first per CLAUDE.md approval gate).

- [ ] **Step 2: Write LoopDetail spec (TDD)**

Create `apps/web/src/app/features/loop-detail/loop-detail.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Item } from '@eling/shared';
import { LoopDetailComponent } from './loop-detail.component';
import { ItemService } from '../../core/item.service';

const mockLoop = (): Item => ({
  id: 'loop-1',
  type: 'loop',
  text: 'fix bug',
  context: 'kerja',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'open',
});

describe('LoopDetailComponent', () => {
  let fixture: ComponentFixture<LoopDetailComponent>;
  let itemService: ItemService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopDetailComponent],
      providers: [
        ItemService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { params: of({ id: 'loop-1' }) },
        },
      ],
    }).compileComponents();
    itemService = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
    // seed item into service
    (itemService as any)['_items'].set([mockLoop()]);
    fixture = TestBed.createComponent(LoopDetailComponent);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('renders loop text', () => {
    expect(fixture.nativeElement.textContent).toContain('fix bug');
  });

  it('calls update when mark done clicked', async () => {
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-done"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', { status: 'done' });
  });

  it('calls update when mark blocked clicked', async () => {
    const spy = vi.spyOn(itemService, 'update').mockResolvedValue();
    fixture.nativeElement.querySelector('[data-testid="btn-blocked"]').click();
    expect(spy).toHaveBeenCalledWith('loop-1', expect.objectContaining({ status: 'blocked' }));
  });
});
```

- [ ] **Step 3: Run spec — expect fail**

```bash
npm exec nx test web -- --testPathPattern=loop-detail.component.spec 2>&1 | tail -10
```

- [ ] **Step 4: Implement LoopDetailComponent**

Create `apps/web/src/app/features/loop-detail/loop-detail.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Item, LoopStatus } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-loop-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './loop-detail.component.html',
})
export class LoopDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itemService = inject(ItemService);

  private readonly id = signal('');
  protected readonly item = computed<Item | undefined>(() =>
    this.itemService.items().find((i) => i.id === this.id())
  );

  protected readonly nextStep = signal('');
  protected readonly blockedReason = signal('');

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.id.set(p['id']);
      this.nextStep.set(this.item()?.nextStep ?? '');
    });
  }

  protected async markStatus(status: LoopStatus): Promise<void> {
    const dto: Record<string, unknown> = { status };
    if (status === 'blocked') dto['blockedReason'] = this.blockedReason();
    await this.itemService.update(this.id(), dto as Parameters<ItemService['update']>[1]);
    await this.router.navigate(['/']);
  }

  protected async saveNextStep(): Promise<void> {
    await this.itemService.update(this.id(), { nextStep: this.nextStep() });
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/']);
  }
}
```

Create `apps/web/src/app/features/loop-detail/loop-detail.component.html`:

```html
@if (item(); as loop) {
  <div class="space-y-6 py-4">
    <div class="flex items-start gap-3">
      <button (click)="goBack()" aria-label="Kembali" class="text-muted hover:text-text mt-0.5">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <p class="text-base font-medium text-text leading-snug">{{ loop.text }}</p>
    </div>

    <!-- next step -->
    <div class="space-y-1">
      <label class="text-xs text-muted uppercase tracking-wide">Next step</label>
      <div class="flex gap-2">
        <input
          type="text"
          [ngModel]="nextStep()"
          (ngModelChange)="nextStep.set($event)"
          name="nextStep"
          placeholder="Langkah berikutnya..."
          class="flex-1 border border-border rounded px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-1 focus:ring-loop"
        />
        <button
          type="button"
          (click)="saveNextStep()"
          class="px-3 py-2 text-sm bg-surface border border-border rounded hover:bg-gray-50 text-muted"
        >Simpan</button>
      </div>
    </div>

    <!-- status actions -->
    <div class="space-y-2">
      <p class="text-xs text-muted uppercase tracking-wide">Status</p>
      <div class="flex flex-col gap-2">
        <button
          data-testid="btn-done"
          type="button"
          (click)="markStatus('done')"
          class="w-full py-2.5 rounded-lg border border-done text-done text-sm font-medium hover:bg-green-50"
        >✓ Tandai selesai</button>

        <button
          data-testid="btn-blocked"
          type="button"
          (click)="markStatus('blocked')"
          class="w-full py-2.5 rounded-lg border border-border text-muted text-sm hover:bg-gray-50"
        >Blocked / menunggu</button>

        <button
          data-testid="btn-waiting"
          type="button"
          (click)="markStatus('waiting')"
          class="w-full py-2.5 rounded-lg border border-border text-muted text-sm hover:bg-gray-50"
        >Menunggu diskusi</button>

        <button
          data-testid="btn-open"
          type="button"
          (click)="markStatus('open')"
          class="w-full py-2.5 rounded-lg border border-border text-muted text-sm hover:bg-gray-50"
        >Buka kembali</button>
      </div>
    </div>

    @if (loop.status === 'blocked' || loop.status === 'waiting') {
      <div class="space-y-1">
        <label class="text-xs text-muted uppercase tracking-wide">Alasan blocked</label>
        <input
          type="text"
          [ngModel]="blockedReason()"
          (ngModelChange)="blockedReason.set($event)"
          name="blockedReason"
          placeholder="Kenapa blocked?"
          class="w-full border border-border rounded px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-1 focus:ring-loop"
        />
      </div>
    }
  </div>
} @else {
  <p class="text-muted text-sm py-8">Loop tidak ditemukan.</p>
}
```

- [ ] **Step 5: Add /loop/:id route**

In `apps/web/src/app/app.routes.ts`, add after the search route (before `**`):

```ts
{
  path: 'loop/:id',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/loop-detail/loop-detail.component').then((m) => m.LoopDetailComponent),
},
```

- [ ] **Step 6: Run spec — expect pass**

```bash
npm exec nx test web -- --testPathPattern=loop-detail.component.spec 2>&1 | tail -10
```
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/features/loop-detail/ apps/web/src/app/app.routes.ts
git commit -m "feat(p3): LoopDetailComponent — next step, status lifecycle"
```

---

### Task 8: SearchComponent

**Files:**
- Create: `apps/web/src/app/features/search/search.component.ts`
- Create: `apps/web/src/app/features/search/search.component.html`
- Create: `apps/web/src/app/features/search/search.component.spec.ts`
- Modify: `apps/web/src/app/app.ts` (add search nav link in header)

- [ ] **Step 1: Write SearchComponent spec (TDD)**

Create `apps/web/src/app/features/search/search.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Item } from '@eling/shared';
import { SearchComponent } from './search.component';
import { ItemService } from '../../core/item.service';

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [
        ItemService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchComponent);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('renders search input', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="search-input"]')).toBeTruthy();
  });

  it('calls search API on input', async () => {
    const itemService = TestBed.inject(ItemService);
    const spy = vi.spyOn(itemService, 'search').mockResolvedValue([]);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="search-input"]');
    input.value = 'test';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 350)); // debounce
    expect(spy).toHaveBeenCalledWith('test');
  });

  it('shows empty state when no results', async () => {
    vi.spyOn(TestBed.inject(ItemService), 'search').mockResolvedValue([]);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="search-input"]');
    input.value = 'xyz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 350));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tidak ada hasil');
  });
});
```

- [ ] **Step 2: Implement SearchComponent**

Create `apps/web/src/app/features/search/search.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Item } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ItemRowComponent } from '../feed/item-row.component';

@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemRowComponent],
  templateUrl: './search.component.html',
})
export class SearchComponent {
  private readonly itemService = inject(ItemService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly results = signal<Item[]>([]);
  protected readonly searched = signal(false);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  protected onInput(value: string): void {
    this.query.set(value);
    if (this.debounce) clearTimeout(this.debounce);
    if (!value.trim()) {
      this.results.set([]);
      this.searched.set(false);
      return;
    }
    this.debounce = setTimeout(async () => {
      const items = await this.itemService.search(value.trim());
      this.results.set(items);
      this.searched.set(true);
    }, 300);
  }

  protected async onOpen(item: Item): Promise<void> {
    if (item.type === 'loop') {
      await this.router.navigate(['/loop', item.id]);
    }
  }
}
```

Create `apps/web/src/app/features/search/search.component.html`:

```html
<div class="space-y-4 py-4 pb-8">
  <input
    data-testid="search-input"
    type="search"
    [value]="query()"
    (input)="onInput($any($event.target).value)"
    placeholder="Cari di semua riwayat..."
    autocomplete="off"
    class="w-full border border-border rounded-lg px-4 py-3 text-sm text-text bg-surface placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-loop"
  />

  @if (searched() && results().length === 0) {
    <p class="text-center text-sm text-muted py-8">Tidak ada hasil untuk "{{ query() }}"</p>
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

- [ ] **Step 3: Add search nav in header**

In `apps/web/src/app/app.ts`, add `RouterLink` to imports and update header:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

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
  protected async onLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
```

- [ ] **Step 4: Run spec — expect pass**

```bash
npm exec nx test web -- --testPathPattern=search.component.spec 2>&1 | tail -10
```
Expected: PASS (3 tests).

- [ ] **Step 5: Run all tests**

```bash
npm exec nx test web 2>&1 | tail -10
```
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/features/search/ apps/web/src/app/app.ts
git commit -m "feat(p3): SearchComponent + search nav in header"
```

---

### Task 9: Final P3 verification + tag

**Files:** none (smoke test + build check)

- [ ] **Step 1: Run all tests**

```bash
npm exec nx test web 2>&1 | tail -15
```
Expected: all suites pass, 0 failures.

- [ ] **Step 2: Production build check**

```bash
npm exec nx build web -- --configuration=production 2>&1 | tail -10
```
Expected: build succeeds, no budget error. Initial bundle should be under 300KB.

- [ ] **Step 3: Start API + serve frontend; smoke test full flow**

In separate terminal: `npm exec nx serve api`

Then: `npm exec nx serve web`

Manual checklist:
- [ ] `/login` page renders
- [ ] Login with wrong password → error message shows
- [ ] Login with correct credentials → redirects to `/`
- [ ] Capture a loop → appears instantly in feed (optimistic)
- [ ] Capture a note → appears with dot, no checkbox
- [ ] Click loop row → navigate to `/loop/:id`
- [ ] Add next step → saved
- [ ] Mark loop done → disappears from top, goes to bottom
- [ ] Navigate to `/search` → search by keyword shows results
- [ ] Logout → redirected to `/login`

- [ ] **Step 4: Commit final state + tag**

```bash
git add -A
git commit -m "feat(p3): Angular SPA complete — login, feed, capture, loop-detail, search"
git tag p3-angular-frontend
```
