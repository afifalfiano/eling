import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule, RouterLink],
  template: `
    <div class="flex flex-col gap-5 p-6 max-w-sm mx-auto mt-10">
      <h1 class="text-xl font-semibold">{{ 'register.title' | transloco }}</h1>

      <p class="text-sm text-muted">{{ 'register.info' | transloco }}</p>

      <input
        type="email"
        [(ngModel)]="email"
        placeholder="{{ 'register.email' | transloco }}"
        class="border border-border rounded-lg px-4 py-3 text-sm bg-surface min-h-[48px] focus:outline-none focus:ring-1 focus:ring-loop"
      />
      <input
        type="password"
        [(ngModel)]="password"
        placeholder="{{ 'register.passwordLabel' | transloco }}"
        class="border border-border rounded-lg px-4 py-3 text-sm bg-surface min-h-[48px] focus:outline-none focus:ring-1 focus:ring-loop"
      />
      @if (error()) {
        <p class="text-red-500 text-sm">{{ error() | transloco }}</p>
      }
      <button
        (click)="submit()"
        [disabled]="loading()"
        class="w-full bg-loop text-white rounded-lg py-3 text-sm font-medium min-h-[48px] hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-all"
      >
        {{ loading() ? ('register.loading' | transloco) : ('register.submit' | transloco) }}
      </button>
      <div class="flex justify-between text-sm mt-2">
        <a routerLink="/login" class="text-muted hover:text-text min-h-11 flex items-center">{{ 'register.login_link' | transloco }}</a>
        <a routerLink="/" class="text-muted hover:text-text min-h-11 flex items-center">{{ 'register.skip' | transloco }}</a>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = signal('');
  protected password = signal('');
  protected error = signal('');
  protected loading = signal(false);

  protected async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.register(this.email(), this.password());
      await this.router.navigate(['/']);
    } catch {
      this.error.set('register.error');
    } finally {
      this.loading.set(false);
    }
  }
}
