import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import type { Context, ItemType } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-capture-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
  templateUrl: './capture-bar.component.html',
})
export class CaptureBarComponent {
  private readonly itemService = inject(ItemService);
  private readonly toast = inject(ToastService);

  protected readonly text = signal('');
  protected readonly type = signal<ItemType>('note');
  protected readonly context = signal<Context>('pribadi');
  protected readonly focused = signal(false);

  protected readonly contexts: Context[] = ['kerja', 'pribadi', 'other'];

  protected toggleType(): void {
    this.type.set(this.type() === 'loop' ? 'note' : 'loop');
  }

  protected async onSubmit(): Promise<void> {
    const t = this.text().trim();
    if (!t) return;
    this.text.set('');
    await this.itemService.create({ text: t, type: this.type(), context: this.context() });
    this.toast.show(this.type() === 'loop' ? '○ Loop ditangkap' : '· Note ditangkap');
  }
}
