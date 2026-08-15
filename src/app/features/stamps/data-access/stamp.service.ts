import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { FirebaseServices } from '@a5a8a0a9/angular-firebase-core';
import { AuthService } from '@core/auth/auth.service';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { LoadingService } from '@core/loading/loading.service';
import {
  AddStampResult,
  MAX_STAMP_NOTE_LENGTH,
  STAMPS_PER_BADGE,
  UserProgress,
  toDate,
} from '@shared/models/models';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';

const EMPTY_PROGRESS: UserProgress = {
  schemaVersion: 1,
  currentStampCount: 0,
  badgeCount: 0,
  updatedAt: null,
};

@Injectable({ providedIn: 'root' })
export class StampService {
  private readonly services = inject(FirebaseServices, { optional: true })?.instances ?? null;
  private readonly globalLoading = inject(LoadingService);
  private readonly progressState = signal<UserProgress>(EMPTY_PROGRESS);

  readonly progress = this.progressState.asReadonly();
  readonly currentStampCount = computed(() => this.progressState().currentStampCount);
  readonly badgeCount = computed(() => this.progressState().badgeCount);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      this.progressState.set(EMPTY_PROGRESS);
      this.error.set(null);
      if (!user || !this.services) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const profileRef = doc(this.services.firestore, 'users', user.uid);
      const unsubscribeProfile = onSnapshot(
        profileRef,
        (snapshot) => {
          const data = snapshot.data();
          if (data) {
            this.progressState.set({
              schemaVersion: 1,
              currentStampCount: Number(data['currentStampCount'] ?? 0),
              badgeCount: Number(data['badgeCount'] ?? 0),
              updatedAt: toDate(data['updatedAt']),
            });
          }
          this.loading.set(false);
        },
        () => {
          this.error.set('無法讀取集章進度，請稍後重試。');
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribeProfile);
    });
  }

  async addStamp(note: string): Promise<AddStampResult> {
    const user = this.requireWritableUser();
    const cleanNote = note.trim();
    if (cleanNote.length > MAX_STAMP_NOTE_LENGTH) {
      throw new Error(`留言最多 ${MAX_STAMP_NOTE_LENGTH} 個字。`);
    }
    if (!this.services) {
      throw new Error('Firebase 尚未設定。');
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      return await this.globalLoading.run('正在蓋下好棒章…', () =>
        runTransaction(this.services!.firestore, async (transaction) => {
          const profileRef = doc(this.services!.firestore, 'users', user.uid);
          const profileSnapshot = await transaction.get(profileRef);
          if (!profileSnapshot.exists()) {
            throw new Error('找不到帳號資料，請重新登入。');
          }

          const profile = profileSnapshot.data();
          const currentCount = Number(profile['currentStampCount'] ?? 0);
          const badgeCount = Number(profile['badgeCount'] ?? 0);
          const unlocked = currentCount === STAMPS_PER_BADGE - 1;
          const nextBadgeOrdinal = unlocked ? badgeCount + 1 : null;
          const stampRef = doc(collection(this.services!.firestore, 'users', user.uid, 'stamps'));

          transaction.set(stampRef, {
            note: cleanNote,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          transaction.update(profileRef, {
            currentStampCount: unlocked ? 0 : currentCount + 1,
            badgeCount: unlocked ? badgeCount + 1 : badgeCount,
            updatedAt: serverTimestamp(),
          });

          if (nextBadgeOrdinal !== null) {
            const ticketRef = doc(
              this.services!.firestore,
              'users',
              user.uid,
              'tickets',
              `badge-${nextBadgeOrdinal}`,
            );
            transaction.set(ticketRef, {
              badgeOrdinal: nextBadgeOrdinal,
              status: 'available',
              wishId: null,
              rewardNameSnapshot: null,
              createdAt: serverTimestamp(),
              redeemedAt: null,
            });
          }

          return {
            unlocked,
            badgeOrdinal: nextBadgeOrdinal,
            currentStampCount: unlocked ? 0 : currentCount + 1,
          };
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '蓋章失敗，請稍後重試。';
      this.error.set(message);
      throw error;
    } finally {
      this.saving.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }

  private requireWritableUser(): { uid: string } {
    const user = this.auth.user();
    if (!user) {
      throw new Error('請先登入。');
    }
    if (!this.connectivity.online()) {
      throw new Error('目前離線，連線後才能修改資料。');
    }
    return user;
  }
}
