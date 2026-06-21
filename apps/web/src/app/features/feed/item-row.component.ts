import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Item } from '@eling/shared';

@Component({
  selector: 'app-item-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-row.component.html',
})
export class ItemRowComponent {
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
    return this.item().status === 'done';
  }

  protected get contextColor(): string {
    const map: Record<string, string> = {
      kerja: 'text-ctx-kerja bg-blue-50',
      pribadi: 'text-ctx-pribadi bg-amber-50',
      other: 'text-ctx-other bg-gray-50',
    };
    return map[this.item().context] ?? map['other'];
  }
}
