import { describe, expect, it } from 'vitest';
import { PurchaseRecord } from '@shared/models/models';
import { mergeInventory } from './purchase.service';

function purchase(
  id: string,
  storeItemId: string,
  nameSnapshot: string,
  purchasedAt: Date,
): PurchaseRecord {
  return {
    id,
    storeItemId,
    nameSnapshot,
    price: 1,
    ticketIds: [id],
    purchasedAt,
  };
}

describe('mergeInventory', () => {
  it('groups repeated purchases by item id and keeps the latest name snapshot', () => {
    const inventory = mergeInventory([
      purchase('ticket-1', 'item-1', '舊名稱', new Date(2026, 0, 1)),
      purchase('ticket-2', 'item-1', '新名稱', new Date(2026, 1, 1)),
      purchase('ticket-3', 'item-2', '另一項商品', new Date(2026, 0, 15)),
    ]);

    expect(inventory).toEqual([
      {
        storeItemId: 'item-1',
        name: '新名稱',
        quantity: 2,
        latestPurchasedAt: new Date(2026, 1, 1),
      },
      {
        storeItemId: 'item-2',
        name: '另一項商品',
        quantity: 1,
        latestPurchasedAt: new Date(2026, 0, 15),
      },
    ]);
  });
});
