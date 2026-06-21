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
