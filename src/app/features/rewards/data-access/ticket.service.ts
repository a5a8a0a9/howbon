import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { FirebaseServices } from '@a5a8a0a9/angular-firebase-core';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { AuthService } from '@core/auth/auth.service';
import { RewardTicket, toDate } from '@shared/models/models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly services = inject(FirebaseServices, { optional: true })?.instances ?? null;
  private readonly ticketState = signal<RewardTicket[]>([]);

  readonly tickets = this.ticketState.asReadonly();
  readonly availableTickets = computed(() =>
    this.ticketState().filter((ticket) => ticket.status === 'available'),
  );
  readonly availableCount = computed(() => this.availableTickets().length);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly auth: AuthService) {
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
}
