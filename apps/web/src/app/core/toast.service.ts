import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  type: 'success' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _messages = signal<Toast[]>([]);
  private id = 0;

  readonly messages = this._messages.asReadonly();

  show(text: string, type: Toast['type'] = 'success'): void {
    const id = ++this.id;
    this._messages.update((m) => [...m, { id, text, type }]);
    setTimeout(() => {
      this._messages.update((m) => m.filter((msg) => msg.id !== id));
    }, 2800);
  }
}
