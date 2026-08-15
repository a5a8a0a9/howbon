import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { FirebaseServices } from '@a5a8a0a9/angular-firebase-core';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthService } from '@core/auth/auth.service';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { LoadingService } from '@core/loading/loading.service';
import { InventoryItem, PurchaseRecord, toDate } from '@shared/models/models';
import { TicketService } from './ticket.service';

export function mergeInventory(purchases: PurchaseRecord[]): InventoryItem[] {
  const inventory = new Map<string, InventoryItem>();

  for (const purchase of purchases) {
    const current = inventory.get(purchase.storeItemId);
    const isLatest =
      !current ||
      current.latestPurchasedAt === null ||
      (purchase.purchasedAt !== null && purchase.purchasedAt > current.latestPurchasedAt);
    inventory.set(purchase.storeItemId, {
      storeItemId: purchase.storeItemId,
      name: isLatest ? purchase.nameSnapshot : current.name,
      quantity: (current?.quantity ?? 0) + 1,
      latestPurchasedAt: isLatest ? purchase.purchasedAt : current.latestPurchasedAt,
    });
  }

  return [...inventory.values()].sort((left, right) => {
    const leftTime = left.latestPurchasedAt?.getTime() ?? 0;
    const rightTime = right.latestPurchasedAt?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly services = inject(FirebaseServices, { optional: true })?.instances ?? null;
  private readonly globalLoading = inject(LoadingService);
  private readonly purchaseState = signal<PurchaseRecord[]>([]);

  readonly purchases = this.purchaseState.asReadonly();
  readonly inventory = computed(() => mergeInventory(this.purchaseState()));
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
    private readonly tickets: TicketService,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      this.purchaseState.set([]);
      this.error.set(null);
      if (!user || !this.services) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const purchaseQuery = query(
        collection(this.services.firestore, 'users', user.uid, 'purchases'),
        orderBy('purchasedAt', 'desc'),
      );
      const unsubscribe = onSnapshot(
        purchaseQuery,
        (snapshot) => {
          this.purchaseState.set(
            snapshot.docs.map((entry) => {
              const data = entry.data();
              return {
                id: entry.id,
                storeItemId: String(data['storeItemId'] ?? ''),
                nameSnapshot: String(data['nameSnapshot'] ?? ''),
                price: Number(data['price'] ?? 1),
                ticketIds: Array.isArray(data['ticketIds'])
                  ? data['ticketIds'].map((ticketId: unknown) => String(ticketId))
                  : [],
                purchasedAt: toDate(data['purchasedAt']),
              };
            }),
          );
          this.loading.set(false);
        },
        () => {
          this.error.set('無法讀取獎賞道具，請稍後重試。');
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  async purchaseItem(itemId: string): Promise<void> {
    const user = this.requireWritableUser();
    const ticket = this.tickets.availableTickets().at(-1);
    if (!ticket) {
      throw new Error('票券不足，集滿五枚章就能獲得新票券。');
    }

    await this.globalLoading.run('正在購買商品…', () =>
      runTransaction(this.services!.firestore, async (transaction) => {
        const itemRef = doc(this.services!.firestore, 'users', user.uid, 'storeItems', itemId);
        const ticketRef = doc(this.services!.firestore, 'users', user.uid, 'tickets', ticket.id);
        const purchaseRef = doc(
          this.services!.firestore,
          'users',
          user.uid,
          'purchases',
          ticket.id,
        );
        const [itemSnapshot, ticketSnapshot] = await Promise.all([
          transaction.get(itemRef),
          transaction.get(ticketRef),
        ]);

        if (!itemSnapshot.exists()) {
          throw new Error('這項商品已不存在，請重新選擇。');
        }
        const item = itemSnapshot.data();
        if (item['price'] !== 1) {
          throw new Error('商品價格已變更，請重新整理後再試。');
        }
        if (!ticketSnapshot.exists() || ticketSnapshot.data()['status'] !== 'available') {
          throw new Error('這張票券已在其他裝置使用，請重新整理。');
        }

        transaction.update(ticketRef, {
          status: 'redeemed',
          wishId: null,
          rewardNameSnapshot: null,
          redeemedAt: serverTimestamp(),
        });
        transaction.set(purchaseRef, {
          storeItemId: itemId,
          nameSnapshot: String(item['name']),
          price: 1,
          ticketIds: [ticket.id],
          purchasedAt: serverTimestamp(),
        });
      }),
    );
  }

  private requireWritableUser(): { uid: string } {
    const user = this.auth.user();
    if (!user || !this.services) {
      throw new Error('請先登入並完成 Firebase 設定。');
    }
    if (!this.connectivity.online()) {
      throw new Error('目前離線，連線後才能購買商品。');
    }
    return user;
  }
}
