import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import type { Item, LoopStatus, UpdateItemDto } from '@eling/shared';
import { ItemService } from '../../core/item.service';

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

  private readonly id = signal('');
  protected readonly item = computed<Item | undefined>(() =>
    this.itemService.items().find((i) => i.id === this.id())
  );

  protected readonly nextStep = signal('');
  protected readonly blockedReason = signal('');

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.id.set(p['id']);
      this.nextStep.set(this.item()?.nextStep ?? '');
    });
  }

  protected async markStatus(status: LoopStatus): Promise<void> {
    const dto: UpdateItemDto = { status };
    if (status === 'blocked') (dto as Record<string, unknown>)['blockedReason'] = this.blockedReason();
    await this.itemService.update(this.id(), dto);
    await this.router.navigate(['/']);
  }

  protected async saveNextStep(): Promise<void> {
    await this.itemService.update(this.id(), { nextStep: this.nextStep() });
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/']);
  }
}
