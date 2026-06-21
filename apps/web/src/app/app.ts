import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { orderFeed } from '@eling/shared';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `<main class="min-h-dvh bg-[#FAFAF8] text-[#1F1E1C] p-4">
    <p class="text-sm">Eling — {{ ready() ? 'ready' : 'booting' }}</p>
    <router-outlet />
  </main>`,
})
export class App {
  protected readonly ready = signal(orderFeed([]).length === 0);
}
