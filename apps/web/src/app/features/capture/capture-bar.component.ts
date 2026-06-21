import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Context, ItemType } from '@eling/shared';
import { ItemService } from '../../core/item.service';

@Component({
  selector: 'app-capture-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-bar.component.html',
})
export class CaptureBarComponent {
  private readonly itemService = inject(ItemService);

  protected readonly text = signal('');
  protected readonly type = signal<ItemType>('loop');
  protected readonly context = signal<Context>('kerja');

  protected readonly contexts: Context[] = ['kerja', 'pribadi', 'other'];

  protected toggleType(): void {
    this.type.set(this.type() === 'loop' ? 'note' : 'loop');
  }

  protected async onSubmit(): Promise<void> {
    const t = this.text().trim();
    if (!t) return;
    this.text.set('');
    await this.itemService.create({ text: t, type: this.type(), context: this.context() });
  }
}
