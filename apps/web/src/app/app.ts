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
import { Toast, ToastService } from './core/toast.service';

const LANG_KEY = 'eling-lang';
const THEME_KEY = 'eling-theme';

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
          <button (click)="toggleLang()" class="flex items-center justify-center min-w-11 h-11 text-xs font-mono text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all border border-border px-2">{{ 'app.langToggle' | transloco }}</button>
          <button (click)="toggleTheme()" class="flex items-center justify-center w-11 h-11 text-muted hover:text-text rounded-lg hover:bg-border/30 active:scale-[0.98] transition-all" [attr.aria-label]="'app.themeAriaLabel' | transloco">
            @if (isDark()) {
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            } @else {
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
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
          <div [class]="toastClass(msg.type)">{{ msg.text }}</div>
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

  protected readonly lang = signal<string>('en');
  protected readonly isDark = signal(false);

  ngOnInit(): void {
    const saved = localStorage.getItem(LANG_KEY) ?? navigator.language.startsWith('id') ? 'id' : 'en';
    this.lang.set(saved);
    this.transloco.setActiveLang(saved);

    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'dark') {
      this.isDark.set(true);
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.isDark.set(true);
      document.documentElement.classList.add('dark');
    }
  }

  protected toggleLang(): void {
    const next = this.lang() === 'id' ? 'en' : 'id';
    this.lang.set(next);
    this.transloco.setActiveLang(next);
    localStorage.setItem(LANG_KEY, next);
  }

  protected toggleTheme(): void {
    this.isDark.update((v) => !v);
    document.documentElement.classList.toggle('dark', this.isDark());
    localStorage.setItem(THEME_KEY, this.isDark() ? 'dark' : 'light');
  }

  protected async onExport(): Promise<void> {
    await this.items.downloadExport();
    this.toast.show(this.transloco.translate('app.exportSuccess'));
  }

  protected toastClass(type: Toast['type']): string {
    const base = 'animate-slide-in pointer-events-auto text-sm px-4 py-3 rounded-lg shadow-lg min-h-[44px] flex items-center border';
    if (type === 'success') return `${base} bg-done text-white border-done dark:bg-surface dark:text-done dark:border-done`;
    if (type === 'info')    return `${base} bg-loop text-white border-loop dark:bg-surface dark:text-loop dark:border-loop`;
    if (type === 'error')   return `${base} bg-red-600 text-white border-red-600`;
    return `${base} bg-text text-bg border-border`;
  }

  protected async onLogout(): Promise<void> {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
