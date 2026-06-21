import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ItemType } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ItemRowComponent } from '../feed/item-row.component';

@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemRowComponent, TranslocoModule],
  templateUrl: './search.component.html',
})
export class SearchComponent {
  private readonly itemService = inject(ItemService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly results = signal<Item[]>([]);
  protected readonly searched = signal(false);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  protected onInput(value: string): void {
    this.query.set(value);
    if (this.debounce) clearTimeout(this.debounce);
    if (!value.trim()) {
      this.results.set([]);
      this.searched.set(false);
      return;
    }
    this.debounce = setTimeout(async () => {
      const items = await this.itemService.search(value.trim());
      this.results.set(items);
      this.searched.set(true);
    }, 300);
  }

  protected async onOpen(item: Item): Promise<void> {
    if (item.type === ItemType.Loop) {
      await this.router.navigate(['/loop', item.id]);
    }
  }
}
