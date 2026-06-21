import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Context, ItemType } from '@eling/shared';
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

  protected readonly ItemType = ItemType;
  protected readonly Context = Context;

  protected readonly text = signal('');
  protected readonly type = signal<ItemType>(ItemType.Note);
  protected readonly context = signal<Context>(Context.Pribadi);
  protected readonly focused = signal(false);

  protected readonly contexts: Context[] = [Context.Kerja, Context.Pribadi, Context.Other];

  protected toggleType(): void {
    this.type.set(this.type() === ItemType.Loop ? ItemType.Note : ItemType.Loop);
  }

  protected async onSubmit(): Promise<void> {
    const t = this.text().trim();
    if (!t) return;
    this.text.set('');
    await this.itemService.create({ text: t, type: this.type(), context: this.context() });
    this.toast.show(this.type() === ItemType.Loop ? '○ Loop ditangkap' : '· Note ditangkap');
  }
}
