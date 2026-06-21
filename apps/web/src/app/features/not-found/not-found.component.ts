import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoModule],
  template: `
    <div class="py-20 text-center flex flex-col items-center gap-5 animate-fade-in-up">
      <svg class="w-20 h-20 text-border" fill="none" viewBox="0 0 80 80" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
        <circle cx="40" cy="40" r="28"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M32 32l16 16M48 32l-16 16"/>
      </svg>
      <h1 class="text-lg font-semibold text-text">404</h1>
      <p class="text-muted text-sm">{{ 'notFound.message' | transloco }}</p>
      <a routerLink="/" class="px-5 py-2.5 min-h-[44px] bg-loop text-white text-sm rounded-lg hover:opacity-90 transition-opacity flex items-center">{{ 'notFound.home' | transloco }}</a>
    </div>
  `,
})
export class NotFoundComponent {}
