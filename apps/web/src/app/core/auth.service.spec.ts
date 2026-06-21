import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('isLoggedIn false when no token', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('isAnon is true when not logged in', () => {
    expect(service.isAnon()).toBe(true);
  });

  it('isAnon is false after login', async () => {
    const p = service.login('a@b.com', 'pw');
    http.expectOne('/api/auth/login').flush({ access_token: 'tok' });
    await p;
    expect(service.isAnon()).toBe(false);
  });

  it('login stores token and sets isLoggedIn true', async () => {
    const promise = service.login('a@b.com', 'pw');
    const req = http.expectOne('/api/auth/login');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ access_token: 'tok' });
    await promise;
    expect(service.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('eling_token')).toBe('tok');
  });

  it('register stores token and sets isLoggedIn true', async () => {
    const promise = service.register('new@b.com', 'pw');
    const req = http.expectOne('/api/auth/register');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ access_token: 'new.tok' });
    await promise;
    expect(service.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('eling_token')).toBe('new.tok');
  });

  it('logout clears token', async () => {
    const promise = service.login('a@b.com', 'pw');
    http.expectOne('/api/auth/login').flush({ access_token: 'tok' });
    await promise;
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
  });
});
