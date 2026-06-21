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
            <button
              (click)="toggleLang()"
              class="text-xs font-mono text-muted hover:text-text border border-border rounded px-1.5 py-0.5"
            >{{ 'app.langToggle' | transloco }}</button>
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
