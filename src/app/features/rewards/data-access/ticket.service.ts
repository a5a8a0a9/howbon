import { Injectable, computed, effect, signal } from '@angular/core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthService } from '../../../core/auth/auth.service';
import { ConnectivityService } from '../../../core/connectivity/connectivity.service';
import { getFirebaseServices } from '../../../core/firebase/firebase-services';
import { RewardTicket, RewardWish, toDate } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly services = getFirebaseServices();
  private readonly ticketState = signal<RewardTicket[]>([]);

  readonly tickets = this.ticketState.asReadonly();
  readonly availableTickets = computed(() =>
    this.ticketState().filter((ticket) => ticket.status === 'available'),
  );
  readonly redeemedTickets = computed(() =>
    this.ticketState().filter((ticket) => ticket.status === 'redeemed'),
  );
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      this.ticketState.set([]);
      if (!user || !this.services) {
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      const ticketQuery = query(
        collection(this.services.firestore, 'users', user.uid, 'tickets'),
        orderBy('createdAt', 'desc'),
      );
      const unsubscribe = onSnapshot(
        ticketQuery,
        (snapshot) => {
          this.ticketState.set(
            snapshot.docs.map((entry) => {
              const data = entry.data();
              return {
                id: entry.id,
                badgeOrdinal: Number(data['badgeOrdinal'] ?? 0),
                status: data['status'] === 'redeemed' ? 'redeemed' : 'available',
                wishId: typeof data['wishId'] === 'string' ? data['wishId'] : null,
                rewardNameSnapshot:
                  typeof data['rewardNameSnapshot'] === 'string'
                    ? data['rewardNameSnapshot']
                    : null,
                createdAt: toDate(data['createdAt']),
                redeemedAt: toDate(data['redeemedAt']),
              };
            }),
          );
          this.loading.set(false);
        },
        () => {
          this.error.set('無法讀取票券，請稍後重試。');
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  async redeemTicket(ticketId: string, wish?: Pick<RewardWish, 'id'>): Promise<void> {
    const user = this.auth.user();
    if (!user || !this.services) {
      throw new Error('請先登入並完成 Firebase 設定。');
    }
    if (!this.connectivity.online()) {
      throw new Error('目前離線，連線後才能兌換票券。');
    }

    await runTransaction(this.services.firestore, async (transaction) => {
      const ticketRef = doc(this.services!.firestore, 'users', user.uid, 'tickets', ticketId);
      const ticketSnapshot = await transaction.get(ticketRef);
      if (!ticketSnapshot.exists()) {
        throw new Error('找不到這張票券，請重新整理。');
      }
      if (ticketSnapshot.data()['status'] !== 'available') {
        throw new Error('這張票券已經兌換過了。');
      }

      let wishId: string | null = null;
      let rewardNameSnapshot: string | null = null;
      if (wish) {
        const wishRef = doc(this.services!.firestore, 'users', user.uid, 'wishes', wish.id);
        const wishSnapshot = await transaction.get(wishRef);
        if (!wishSnapshot.exists()) {
          throw new Error('選擇的願望已不存在，請重新選擇或自由兌換。');
        }
        wishId = wish.id;
        rewardNameSnapshot = String(wishSnapshot.data()['name']);
      }

      transaction.update(ticketRef, {
        status: 'redeemed',
        wishId,
        rewardNameSnapshot,
        redeemedAt: serverTimestamp(),
      });
    });
  }
}
