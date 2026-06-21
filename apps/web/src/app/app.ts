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
