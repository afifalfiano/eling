import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ItemType, LoopStatus, orderFeed, getStaleItems } from '@eling/shared';
import type { Item } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ToastService } from '../../core/toast.service';
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
  protected readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly loading = signal(false);
  protected readonly orderedItems = computed(() => orderFeed(this.itemService.items()));
  protected readonly staleItems = computed(() => getStaleItems(this.itemService.items()));

  protected get openCount(): number {
    return this.itemService.items().filter((i) => i.type === ItemType.Loop && i.status === LoopStatus.Open).length;
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.itemService.loadAll();
    } catch {
      this.toast.show(this.transloco.translate('feed.loadError'), 'error');
    } finally {
      this.loading.set(false);
    }
  }

  protected async onOpen(item: Item): Promise<void> {
    await this.router.navigate(['/loop', item.id]);
  }

  protected async onToggleDone(item: Item): Promise<void> {
    try {
      const newStatus = item.status === LoopStatus.Done ? LoopStatus.Open : LoopStatus.Done;
      await this.itemService.update(item.id, { status: newStatus });
      this.toast.show(newStatus === LoopStatus.Done ? this.transloco.translate('feed.markedDone') : this.transloco.translate('feed.reopened'));
    } catch {
      this.toast.show(this.transloco.translate('feed.updateError'), 'error');
    }
  }
}
