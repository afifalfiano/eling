import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ItemService } from '../../core/item.service';

@Component({
  selector: 'app-export-gate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoModule],
  template: `
    <div class="flex flex-col gap-4 p-6 max-w-sm mx-auto mt-20">
      <h1 class="text-xl font-semibold">{{ 'export.title' | transloco }}</h1>
      <p class="text-sm text-gray-500">{{ 'export.description' | transloco }}</p>
      <button
        (click)="onExport()"
        class="bg-black text-white rounded px-4 py-2"
      >
        {{ 'export.download' | transloco }}
      </button>
    </div>
  `,
})
export class ExportGateComponent {
  private readonly items = inject(ItemService);
  private readonly router = inject(Router);

  protected async onExport(): Promise<void> {
    await this.items.downloadExport();
    await this.router.navigate(['/']);
  }
}
