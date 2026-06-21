import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CreateItemDto, Item, UpdateItemDto } from '@eling/shared';

function toItem(raw: Record<string, unknown>): Item {
  return {
    ...(raw as unknown as Item),
    createdAt: new Date(raw['createdAt'] as string),
    updatedAt: new Date(raw['updatedAt'] as string),
    doneAt: raw['doneAt'] ? new Date(raw['doneAt'] as string) : null,
  };
}

@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly http = inject(HttpClient);
  private readonly _items = signal<Item[]>([]);

  readonly items = this._items.asReadonly();

  async loadAll(filters?: { status?: string; type?: string; context?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.context) params.set('context', filters.context);
    const qs = params.toString() ? `?${params}` : '';
    const raw = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`/api/items${qs}`)
    );
    this._items.set(raw.map(toItem));
  }

  async create(dto: CreateItemDto): Promise<void> {
    const temp: Item = {
      id: `temp-${Date.now()}`,
      type: dto.type ?? 'loop',
      text: dto.text,
      context: dto.context ?? 'kerja',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: dto.type !== 'note' ? 'open' : undefined,
    };
    this._items.update((prev) => [temp, ...prev]);
    try {
      const raw = await firstValueFrom(
        this.http.post<Record<string, unknown>>('/api/items', dto)
      );
      const confirmed = toItem(raw);
      this._items.update((prev) => prev.map((i) => (i.id === temp.id ? confirmed : i)));
    } catch (err) {
      this._items.update((prev) => prev.filter((i) => i.id !== temp.id));
      throw err;
    }
  }

  async update(id: string, dto: UpdateItemDto): Promise<void> {
    const raw = await firstValueFrom(
      this.http.patch<Record<string, unknown>>(`/api/items/${id}`, dto)
    );
    const updated = toItem(raw);
    this._items.update((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/items/${id}`));
    this._items.update((prev) => prev.filter((i) => i.id !== id));
  }

  async search(q: string): Promise<Item[]> {
    const raw = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(`/api/items/search?q=${encodeURIComponent(q)}`)
    );
    return raw.map(toItem);
  }
}
