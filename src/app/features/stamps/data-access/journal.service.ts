import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { getFirebaseServices } from '@core/firebase/firebase-services';
import { LoadingService } from '@core/loading/loading.service';
import { MAX_STAMP_NOTE_LENGTH, StampRecord, toDate } from '@shared/models/models';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

export interface MonthBounds {
  start: Date;
  end: Date;
}

export function normalizeMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function monthBounds(value: Date): MonthBounds {
  const start = normalizeMonth(value);
  return {
    start,
    end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
  };
}

export function shiftMonth(value: Date, offset: number): Date {
  const normalized = normalizeMonth(value);
  return new Date(normalized.getFullYear(), normalized.getMonth() + offset, 1);
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

@Injectable({ providedIn: 'root' })
export class JournalService {
  private readonly services = getFirebaseServices();
  private readonly globalLoading = inject(LoadingService);
  private readonly selectedMonthState = signal(normalizeMonth(new Date()));
  private readonly entryState = signal<StampRecord[]>([]);

  readonly selectedMonth = this.selectedMonthState.asReadonly();
  readonly entries = this.entryState.asReadonly();
  readonly canGoNext = computed(() => !isSameMonth(this.selectedMonthState(), new Date()));
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      const selectedMonth = this.selectedMonthState();
      this.entryState.set([]);
      this.error.set(null);

      if (!user || !this.services) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const bounds = monthBounds(selectedMonth);
      const entriesQuery = query(
        collection(this.services.firestore, 'users', user.uid, 'stamps'),
        where('createdAt', '>=', bounds.start),
        where('createdAt', '<', bounds.end),
        orderBy('createdAt', 'desc'),
      );
      const unsubscribe = onSnapshot(
        entriesQuery,
        (snapshot) => {
          this.entryState.set(
            snapshot.docs.map((entry) => {
              const data = entry.data();
              return {
                id: entry.id,
                note: String(data['note'] ?? ''),
                createdAt: toDate(data['createdAt']),
                updatedAt: toDate(data['updatedAt']),
              };
            }),
          );
          this.loading.set(false);
        },
        () => {
          this.error.set('無法讀取這個月的集章日誌，請稍後重試。');
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  previousMonth(): void {
    this.selectedMonthState.update((selected) => shiftMonth(selected, -1));
  }

  nextMonth(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.selectedMonthState.update((selected) => shiftMonth(selected, 1));
  }

  async updateNote(stampId: string, note: string): Promise<void> {
    const user = this.requireWritableUser();
    const cleanNote = note.trim();
    if (cleanNote.length > MAX_STAMP_NOTE_LENGTH) {
      throw new Error(`留言最多 ${MAX_STAMP_NOTE_LENGTH} 個字。`);
    }
    await this.globalLoading.run('正在儲存留言…', () =>
      updateDoc(doc(this.services!.firestore, 'users', user.uid, 'stamps', stampId), {
        note: cleanNote,
        updatedAt: serverTimestamp(),
      }),
    );
  }

  private requireWritableUser(): { uid: string } {
    const user = this.auth.user();
    if (!user || !this.services) {
      throw new Error('請先登入並完成 Firebase 設定。');
    }
    if (!this.connectivity.online()) {
      throw new Error('目前離線，連線後才能修改留言。');
    }
    return user;
  }
}
