import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-loop-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Loop detail</p>`,
})
export class LoopDetailComponent {}
