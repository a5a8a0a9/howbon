export const STAMPS_PER_BADGE = 5;
export const MAX_STAMP_NOTE_LENGTH = 300;
export const MAX_STORE_ITEM_NAME_LENGTH = 80;

export interface AppUserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface UserProgress {
  schemaVersion: 1;
  currentStampCount: number;
  badgeCount: number;
  updatedAt: Date | null;
}

export interface StampRecord {
  id: string;
  note: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type TicketStatus = 'available' | 'redeemed';

export interface RewardTicket {
  id: string;
  badgeOrdinal: number;
  status: TicketStatus;
  wishId: string | null;
  rewardNameSnapshot: string | null;
  createdAt: Date | null;
  redeemedAt: Date | null;
}

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PurchaseRecord {
  id: string;
  storeItemId: string;
  nameSnapshot: string;
  price: number;
  ticketIds: string[];
  purchasedAt: Date | null;
}

export interface InventoryItem {
  storeItemId: string;
  name: string;
  quantity: number;
  latestPurchasedAt: Date | null;
}

export interface AddStampResult {
  unlocked: boolean;
  badgeOrdinal: number | null;
  currentStampCount: number;
}

export function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const candidate = value as { toDate(): Date };
    return candidate.toDate();
  }
  return null;
}
