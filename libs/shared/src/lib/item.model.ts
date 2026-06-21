export type ItemType = 'note' | 'loop';
export type Context = 'kerja' | 'pribadi' | 'other';
export type LoopStatus = 'open' | 'blocked' | 'waiting' | 'done';

export interface Item {
  id: string;
  type: ItemType;
  text: string;
  context: Context;
  createdAt: Date;
  updatedAt: Date;
  status?: LoopStatus;
  nextStep?: string;
  blockedReason?: string;
  doneAt?: Date | null;
}

export interface CreateItemDto {
  text: string;
  type?: ItemType;
  context?: Context;
}

export interface UpdateItemDto {
  text?: string;
  type?: ItemType;
  context?: Context;
  status?: LoopStatus;
  nextStep?: string;
  blockedReason?: string;
}
