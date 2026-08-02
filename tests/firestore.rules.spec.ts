import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const projectId = 'demo-howbon';
let environment: RulesTestEnvironment;

function validUser() {
  return {
    schemaVersion: 1,
    displayName: '測試使用者',
    photoURL: null,
    currentStampCount: 0,
    badgeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function validTicket(badgeOrdinal = 1) {
  return {
    badgeOrdinal,
    status: 'available',
    wishId: null,
    rewardNameSnapshot: null,
    createdAt: serverTimestamp(),
    redeemedAt: null,
  };
}

function validStoreItem(name = '看一場電影') {
  return {
    name,
    price: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function purchaseWithTicket(db: Firestore, ticketId: string, itemId: string) {
  const ticketRef = doc(db, 'users', 'alice', 'tickets', ticketId);
  const itemRef = doc(db, 'users', 'alice', 'storeItems', itemId);
  const purchaseRef = doc(db, 'users', 'alice', 'purchases', ticketId);
  return runTransaction(db, async (transaction) => {
    const [ticket, item] = await Promise.all([
      transaction.get(ticketRef),
      transaction.get(itemRef),
    ]);
    transaction.update(ticketRef, {
      status: 'redeemed',
      wishId: null,
      rewardNameSnapshot: null,
      redeemedAt: serverTimestamp(),
    });
    transaction.set(purchaseRef, {
      storeItemId: itemId,
      nameSnapshot: item.data()?.['name'] ?? '看一場電影',
      price: item.data()?.['price'] ?? 1,
      ticketIds: [ticket.id],
      purchasedAt: serverTimestamp(),
    });
  });
}

describe('Firestore security rules', () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync(resolve('firestore.rules'), 'utf8'),
      },
    });
  });

  afterEach(async () => environment.clearFirestore());
  afterAll(async () => environment.cleanup());

  it('rejects unauthenticated reads', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', 'alice')));
  });

  it('isolates each user path', async () => {
    const alice = environment.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), validUser()));
    await assertFails(getDoc(doc(alice, 'users', 'bob')));
  });

  it('accepts a valid wish and rejects an empty wish', async () => {
    const db = environment.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', 'alice', 'wishes', 'wish-1'), {
        name: '吃一頓大餐',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, 'users', 'alice', 'wishes', 'wish-2'), {
        name: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('enforces price 1 and immutable price on store items', async () => {
    const db = environment.authenticatedContext('alice').firestore();
    const itemRef = doc(db, 'users', 'alice', 'storeItems', 'item-1');
    await assertSucceeds(setDoc(itemRef, validStoreItem()));
    await assertFails(
      setDoc(doc(db, 'users', 'alice', 'storeItems', 'item-2'), {
        ...validStoreItem(),
        price: 2,
      }),
    );
    await assertFails(updateDoc(itemRef, { price: 2, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(itemRef, { name: '新的名稱', updatedAt: serverTimestamp() }));
  });

  it('requires purchase creation and ticket redemption to be atomic', async () => {
    const db = environment.authenticatedContext('alice').firestore();
    const ticketRef = doc(db, 'users', 'alice', 'tickets', 'badge-1');
    const itemRef = doc(db, 'users', 'alice', 'storeItems', 'item-1');
    await assertSucceeds(setDoc(ticketRef, validTicket()));
    await assertSucceeds(setDoc(itemRef, validStoreItem()));

    await assertFails(
      setDoc(doc(db, 'users', 'alice', 'purchases', 'badge-1'), {
        storeItemId: 'item-1',
        nameSnapshot: '看一場電影',
        price: 1,
        ticketIds: ['badge-1'],
        purchasedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(ticketRef, {
        status: 'redeemed',
        wishId: null,
        rewardNameSnapshot: null,
        redeemedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(purchaseWithTicket(db, 'badge-1', 'item-1'));
  });

  it('rejects a deleted item and ticket reuse', async () => {
    const db = environment.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users', 'alice', 'tickets', 'badge-1'), validTicket()));
    await assertSucceeds(setDoc(doc(db, 'users', 'alice', 'tickets', 'badge-2'), validTicket(2)));
    const itemRef = doc(db, 'users', 'alice', 'storeItems', 'item-1');
    await assertSucceeds(setDoc(itemRef, validStoreItem()));
    await assertSucceeds(purchaseWithTicket(db, 'badge-1', 'item-1'));

    await assertFails(
      setDoc(doc(db, 'users', 'alice', 'purchases', 'badge-1-copy'), {
        storeItemId: 'item-1',
        nameSnapshot: '看一場電影',
        price: 1,
        ticketIds: ['badge-1'],
        purchasedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(deleteDoc(itemRef));
    await assertFails(purchaseWithTicket(db, 'badge-2', 'item-1'));
  });

  it('keeps purchases immutable', async () => {
    const db = environment.authenticatedContext('alice').firestore();
    const ticketRef = doc(db, 'users', 'alice', 'tickets', 'badge-1');
    await assertSucceeds(setDoc(ticketRef, validTicket()));
    await assertSucceeds(
      setDoc(doc(db, 'users', 'alice', 'storeItems', 'item-1'), validStoreItem()),
    );
    await assertSucceeds(purchaseWithTicket(db, 'badge-1', 'item-1'));
    const purchaseRef = doc(db, 'users', 'alice', 'purchases', 'badge-1');

    await assertFails(updateDoc(purchaseRef, { nameSnapshot: '竄改名稱' }));
    await assertFails(deleteDoc(purchaseRef));
  });
});
