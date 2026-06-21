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
import { ToastService } from './core/toast.service';

const LANG_KEY = 'eling-lang';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, TranslocoModule],
  template: `
    <div class="min-h-dvh bg-bg text-text font-sans">
      <header class="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between max-w-xl mx-auto w-full min-h-[56px]">
        <a routerLink="/" class="font-medium text-base hover:opacity-80 min-h-11 flex items-center">Eling</a>
        <div class="flex items-center gap-1">
                      <a routerLink="/search" class="flex items-center justify-center w-11 h-11 text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all" [attr.aria-label]="'app.searchAriaLabel' | transloco">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
          </a>
          @if (auth.isLoggedIn()) {
            <button (click)="onExport()" class="flex items-center justify-center w-11 h-11 text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all" [attr.aria-label]="'app.exportAriaLabel' | transloco">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 12l4 4 4-4M12 4v12"/>
              </svg>
            </button>
          }
          <button (click)="toggleLang()" class="flex items-center justify-center min-w-11 h-11 text-xs font-mono text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all border border-border px-2">
            {{ 'app.langToggle' | transloco }}
          </button>
          @if (auth.isLoggedIn()) {
            <button (click)="onLogout()" class="flex items-center justify-center min-w-11 h-11 px-3 text-sm text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all">{{ 'app.logout' | transloco }}</button>
          } @else {
            <a routerLink="/login" class="flex items-center justify-center min-w-11 h-11 px-3 text-sm text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all">{{ 'app.login' | transloco }}</a>
            <a routerLink="/register" class="flex items-center justify-center h-11 px-4 text-sm bg-loop text-white rounded-lg hover:opacity-90 active:scale-[0.98] transition-all">{{ 'app.register' | transloco }}</a>
          }
        </div>
      </header>

      <main class="max-w-xl mx-auto px-4 pb-32 pt-4">
        <router-outlet />
      </main>

      <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
        @for (msg of toast.messages(); track msg.id) {
          <div
            class="animate-slide-in pointer-events-auto bg-text text-bg text-sm px-4 py-3 rounded-lg shadow-lg min-h-[44px] flex items-center"
            [class.bg-done]="msg.type === 'success'"
            [class.text-white]="msg.type === 'success'"
            [class.bg-loop]="msg.type === 'info'"
            [class.bg-red-600]="msg.type === 'error'"
            [class.text-white]="msg.type === 'error'"
          >
            {{ msg.text }}
          </div>
        }
      </div>
    </div>
  `,
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly toast = inject(ToastService);
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
    this.toast.show('Export berhasil');
  }

  protected async onLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
