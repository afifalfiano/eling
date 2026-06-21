import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ItemType, LoopStatus } from '@eling/shared';
import type { Item, UpdateItemDto } from '@eling/shared';
import { ItemService } from '../../core/item.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-loop-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
  templateUrl: './loop-detail.component.html',
})
export class LoopDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itemService = inject(ItemService);
  private readonly toast = inject(ToastService);

  protected readonly ItemType = ItemType;
  protected readonly LoopStatus = LoopStatus;

  private readonly id = signal('');
  private readonly loadedItem = signal<Item | undefined>(undefined);
  protected readonly item = computed<Item | undefined>(() =>
    this.loadedItem() ?? this.itemService.items().find((i) => i.id === this.id())
  );

  protected readonly nextStep = signal('');
  protected readonly blockedReason = signal('');
  protected readonly editText = signal('');

  ngOnInit(): void {
    this.route.params.subscribe(async (p) => {
      this.id.set(p['id']);
      const local = this.itemService.items().find((i) => i.id === this.id());
      if (local) {
        this.editText.set(local.text ?? '');
        this.nextStep.set(local.nextStep ?? '');
        this.blockedReason.set(local.blockedReason ?? '');
      } else {
        try {
          const fetched = await this.itemService.getById(this.id());
          this.loadedItem.set(fetched);
          this.editText.set(fetched.text ?? '');
          this.nextStep.set(fetched.nextStep ?? '');
          this.blockedReason.set(fetched.blockedReason ?? '');
        } catch {
          /* stays undefined → not-found */
        }
      }
    });
  }

  protected async saveText(): Promise<void> {
    const t = this.editText().trim();
    if (!t || t === this.item()?.text) return;
    try {
      await this.itemService.update(this.id(), { text: t });
      this.toast.show('Tersimpan');
    } catch {
      this.toast.show('Gagal menyimpan', 'error');
    }
  }

  protected async markStatus(status: LoopStatus): Promise<void> {
    try {
      const dto: UpdateItemDto = { status };
      if (status === LoopStatus.Blocked) (dto as Record<string, unknown>)['blockedReason'] = this.blockedReason();
      await this.itemService.update(this.id(), dto);
      await this.router.navigate(['/']);
    } catch {
      this.toast.show('Gagal update status', 'error');
    }
  }

  protected async saveNextStep(): Promise<void> {
    try {
      await this.itemService.update(this.id(), { nextStep: this.nextStep() });
      this.toast.show('Tersimpan');
    } catch {
      this.toast.show('Gagal menyimpan', 'error');
    }
  }

  protected async onDelete(): Promise<void> {
    if (!confirm('Hapus item ini?')) return;
    try {
      await this.itemService.remove(this.id());
      this.toast.show('Terhapus');
      await this.router.navigate(['/']);
    } catch {
      this.toast.show('Gagal menghapus', 'error');
    }
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/']);
  }
}
