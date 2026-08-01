import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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

  it('allows one-way ticket redemption and rejects reuse', async () => {
    const db = environment.authenticatedContext('alice').firestore();
    const ticketRef = doc(db, 'users', 'alice', 'tickets', 'badge-1');
    await assertSucceeds(
      setDoc(ticketRef, {
        badgeOrdinal: 1,
        status: 'available',
        wishId: null,
        rewardNameSnapshot: null,
        createdAt: serverTimestamp(),
        redeemedAt: null,
      }),
    );
    await assertSucceeds(
      updateDoc(ticketRef, {
        status: 'redeemed',
        wishId: null,
        rewardNameSnapshot: null,
        redeemedAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(ticketRef, { status: 'available', redeemedAt: null }));
  });
});
