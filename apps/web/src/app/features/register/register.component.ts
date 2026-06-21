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
    <div class="flex flex-col gap-4 p-6 max-w-sm mx-auto mt-20">
      <h1 class="text-xl font-semibold">{{ 'register.title' | transloco }}</h1>
      <input
        type="email"
        [(ngModel)]="email"
        placeholder="{{ 'register.email' | transloco }}"
        class="border rounded px-3 py-2"
      />
      <input
        type="password"
        [(ngModel)]="password"
        placeholder="{{ 'register.password' | transloco }}"
        class="border rounded px-3 py-2"
      />
      @if (error()) {
        <p class="text-red-500 text-sm">{{ error() | transloco }}</p>
      }
      <button
        (click)="submit()"
        [disabled]="loading()"
        class="bg-black text-white rounded px-4 py-2"
      >
        {{ loading() ? ('register.loading' | transloco) : ('register.submit' | transloco) }}
      </button>
      <a routerLink="/login" class="text-sm text-center text-gray-500">
        {{ 'register.login_link' | transloco }}
      </a>
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
