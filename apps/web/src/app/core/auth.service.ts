import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const TOKEN_KEY = 'eling_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _isLoggedIn = signal(!!localStorage.getItem(TOKEN_KEY));

  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly isAnon = computed(() => !this._isLoggedIn());

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ access_token: string }>(
        '/api/auth/login',
        { email, password },
        { withCredentials: true },
      ),
    );
    localStorage.setItem(TOKEN_KEY, res.access_token);
    this._isLoggedIn.set(true);
  }

  async register(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ access_token: string }>(
        '/api/auth/register',
        { email, password },
        { withCredentials: true },
      ),
    );
    localStorage.setItem(TOKEN_KEY, res.access_token);
    this._isLoggedIn.set(true);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._isLoggedIn.set(false);
  }
}
