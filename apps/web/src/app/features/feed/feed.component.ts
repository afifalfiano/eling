import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { orderFeed } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ItemRowComponent } from './item-row.component';
import { CaptureBarComponent } from '../capture/capture-bar.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemRowComponent, CaptureBarComponent, TranslocoModule],
  templateUrl: './feed.component.html',
})
export class FeedComponent implements OnInit {
  protected readonly itemService = inject(ItemService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly orderedItems = computed(() => orderFeed(this.itemService.items()));

  protected get openCount(): number {
    return this.itemService.items().filter((i) => i.type === 'loop' && i.status === 'open').length;
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.itemService.loadAll();
    } finally {
      this.loading.set(false);
    }
  }

  protected async onOpen(item: Item): Promise<void> {
    if (item.type === 'loop') {
      await this.router.navigate(['/loop', item.id]);
    }
  }

  protected async onToggleDone(item: Item): Promise<void> {
    const newStatus = item.status === 'done' ? 'open' : 'done';
    await this.itemService.update(item.id, { status: newStatus });
  }
}
