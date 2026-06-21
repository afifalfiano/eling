import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Item } from '@eling/shared';
import { Context, ItemType, LoopStatus } from '@eling/shared';

@Component({
  selector: 'app-item-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-row.component.html',
})
export class ItemRowComponent {
  protected readonly ItemType = ItemType;
  protected readonly LoopStatus = LoopStatus;

  readonly item = input.required<Item>();
  readonly open = output<Item>();
  readonly done = output<Item>();

  protected onClick(): void {
    this.open.emit(this.item());
  }

  protected onToggleDone(event: Event): void {
    event.stopPropagation();
    this.done.emit(this.item());
  }

  protected get isDone(): boolean {
    return this.item().status === LoopStatus.Done;
  }

  protected get contextColor(): string {
    const map: Record<Context, string> = {
      [Context.Kerja]: 'text-ctx-kerja bg-blue-50',
      [Context.Pribadi]: 'text-ctx-pribadi bg-amber-50',
      [Context.Other]: 'text-ctx-other bg-gray-50',
    };
    return map[this.item().context] ?? map[Context.Other];
  }
}
