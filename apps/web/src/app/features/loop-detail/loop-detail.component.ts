import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Context, ItemType, LoopStatus } from '@eling/shared';
import type { Item, ItemHistory, UpdateItemDto } from '@eling/shared';
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
  private readonly transloco = inject(TranslocoService);

  protected readonly ItemType = ItemType;
  protected readonly LoopStatus = LoopStatus;
  protected readonly Context = Context;
  protected readonly contexts = Object.values(Context);

  private readonly id = signal('');
  private readonly loadedItem = signal<Item | undefined>(undefined);
  protected readonly item = computed<Item | undefined>(() =>
    this.loadedItem() ?? this.itemService.items().find((i) => i.id === this.id())
  );

  protected readonly nextStep = signal('');
  protected readonly blockedReason = signal('');
  protected readonly editText = signal('');
  protected readonly selectedContext = signal<Context>(Context.Kerja);
  protected readonly selectedStatus = signal<LoopStatus>(LoopStatus.Open);
  protected readonly history = signal<ItemHistory[]>([]);
  private async refreshHistory(): Promise<void> {
    try {
      this.history.set(await this.itemService.getHistory(this.id()));
    } catch { /* ignore */ }
  }

  ngOnInit(): void {
    this.route.params.subscribe(async (p) => {
      this.id.set(p['id']);
      const local = this.itemService.items().find((i) => i.id === this.id());
      if (local) {
        this.editText.set(local.text ?? '');
        this.nextStep.set(local.nextStep ?? '');
        this.blockedReason.set(local.blockedReason ?? '');
        this.selectedContext.set(local.context);
        if (local.type === ItemType.Loop) this.selectedStatus.set(local.status!);
      } else {
        try {
          const fetched = await this.itemService.getById(this.id());
          this.loadedItem.set(fetched);
          this.editText.set(fetched.text ?? '');
          this.nextStep.set(fetched.nextStep ?? '');
          this.blockedReason.set(fetched.blockedReason ?? '');
          this.selectedContext.set(fetched.context);
          if (fetched.type === ItemType.Loop) this.selectedStatus.set(fetched.status!);
        } catch {
          /* stays undefined → not-found */
        }
      }
      try {
        const h = await this.itemService.getHistory(this.id());
        this.history.set(h);
      } catch { /* ignore history load failure */ }
    });
  }

  protected selectStatus(status: LoopStatus): void {
    this.selectedStatus.set(status);
    if (status !== LoopStatus.Blocked) this.blockedReason.set('');
  }

  protected async saveAll(): Promise<void> {
    const dto: Record<string, unknown> = {};
    const item = this.item();
    if (!item) return;

    const t = this.editText().trim();
    if (t && t !== item.text) dto['text'] = t;

    const ctx = this.selectedContext();
    if (ctx !== item.context) dto['context'] = ctx;

    if (item.type === ItemType.Loop) {
      const ns = this.nextStep();
      if (ns !== (item.nextStep ?? '')) dto['nextStep'] = ns;

      const st = this.selectedStatus();
      if (st !== item.status) {
        dto['status'] = st;
        if (st === LoopStatus.Blocked) {
          dto['blockedReason'] = this.blockedReason();
        } else if (item.blockedReason) {
          dto['blockedReason'] = '';
        }
      }
    }

    if (Object.keys(dto).length === 0) return;

    try {
      await this.itemService.update(this.id(), dto as UpdateItemDto);
      this.toast.show(this.transloco.translate('loopDetail.saved'));
      if (item.type === ItemType.Loop) await this.refreshHistory();
      await this.router.navigate(['/']);
    } catch {
      this.toast.show(this.transloco.translate('loopDetail.saveError'), 'error');
    }
  }

  protected async onDelete(): Promise<void> {
    if (!confirm(this.transloco.translate('loopDetail.deleteConfirm'))) return;
    try {
      await this.itemService.remove(this.id());
      this.toast.show(this.transloco.translate('loopDetail.deleted'));
      await this.router.navigate(['/']);
    } catch {
      this.toast.show(this.transloco.translate('loopDetail.deleteError'), 'error');
    }
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/']);
  }

  protected fmtField(field: string): string {
    const key = this.transloco.translate('loopDetail.field' + field.charAt(0).toUpperCase() + field.slice(1));
    return key !== 'loopDetail.field' + field.charAt(0).toUpperCase() + field.slice(1) ? key : field;
  }

  protected fmtVal(field: string, val: string | null): string {
    if (val === null) return '—';
    if (field === 'status') {
      return this.transloco.translate('loopDetail.val' + val.charAt(0).toUpperCase() + val.slice(1));
    }
    return val;
  }

  protected fmtTime(d: Date): string {
    const t = d.toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
    return `${d.toLocaleDateString('id', { day: 'numeric', month: 'short', year: 'numeric' })} ${t}`;
  }
}
