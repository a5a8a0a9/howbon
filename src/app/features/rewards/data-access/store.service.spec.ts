import { describe, expect, it } from 'vitest';
import { StoreItem } from '@shared/models/models';
import { prependStoreItemIfMissing } from './store.service';

function item(id: string, name: string): StoreItem {
  return {
    id,
    name,
    price: 1,
    createdAt: null,
    updatedAt: null,
  };
}

describe('prependStoreItemIfMissing', () => {
  it('shows a newly created item before the Firestore listener responds', () => {
    const existing = item('existing', 'Existing item');
    const created = item('created', 'Created item');

    expect(prependStoreItemIfMissing([existing], created)).toEqual([created, existing]);
  });

  it('does not duplicate an item already delivered by the Firestore listener', () => {
    const created = item('created', 'Created item');
    const items = [created];

    expect(prependStoreItemIfMissing(items, created)).toBe(items);
  });
});
