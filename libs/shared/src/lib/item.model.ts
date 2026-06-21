export enum ItemType {
  Note = 'note',
  Loop = 'loop',
}

export enum Context {
  Kerja = 'kerja',
  Pribadi = 'pribadi',
  Other = 'other',
}

export enum LoopStatus {
  Open = 'open',
  Blocked = 'blocked',
  Waiting = 'waiting',
  Done = 'done',
}

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

export interface ItemHistory {
  id: string;
  itemId: string;
  field: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
}
