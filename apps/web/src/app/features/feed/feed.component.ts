import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Feed</p>`,
})
export class FeedComponent {}
