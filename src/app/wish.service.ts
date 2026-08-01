import { Injectable, effect, signal } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { ConnectivityService } from './connectivity.service';
import { getFirebaseServices } from './firebase-services';
import { MAX_WISH_NAME_LENGTH, RewardWish, toDate } from './models';

@Injectable({ providedIn: 'root' })
export class WishService {
  private readonly services = getFirebaseServices();
  private readonly wishState = signal<RewardWish[]>([]);

  readonly wishes = this.wishState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      this.wishState.set([]);
      if (!user || !this.services) {
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      const wishesQuery = query(
        collection(this.services.firestore, 'users', user.uid, 'wishes'),
        orderBy('createdAt', 'desc'),
      );
      const unsubscribe = onSnapshot(
        wishesQuery,
        (snapshot) => {
          this.wishState.set(
            snapshot.docs.map((entry) => {
              const data = entry.data();
              return {
                id: entry.id,
                name: String(data['name'] ?? ''),
                createdAt: toDate(data['createdAt']),
                updatedAt: toDate(data['updatedAt']),
              };
            }),
          );
          this.loading.set(false);
        },
        () => {
          this.error.set('無法讀取願望清單，請稍後重試。');
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  async createWish(name: string): Promise<void> {
    const user = this.requireWritableUser();
    const cleanName = this.validateName(name);
    await addDoc(collection(this.services!.firestore, 'users', user.uid, 'wishes'), {
      name: cleanName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async renameWish(wishId: string, name: string): Promise<void> {
    const user = this.requireWritableUser();
    const cleanName = this.validateName(name);
    await updateDoc(doc(this.services!.firestore, 'users', user.uid, 'wishes', wishId), {
      name: cleanName,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteWish(wishId: string): Promise<void> {
    const user = this.requireWritableUser();
    await deleteDoc(doc(this.services!.firestore, 'users', user.uid, 'wishes', wishId));
  }

  private validateName(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('請輸入願望名稱。');
    }
    if (cleanName.length > MAX_WISH_NAME_LENGTH) {
      throw new Error(`願望名稱最多 ${MAX_WISH_NAME_LENGTH} 個字。`);
    }
    return cleanName;
  }

  private requireWritableUser(): { uid: string } {
    const user = this.auth.user();
    if (!user || !this.services) {
      throw new Error('請先登入並完成 Firebase 設定。');
    }
    if (!this.connectivity.online()) {
      throw new Error('目前離線，連線後才能修改願望。');
    }
    return user;
  }
}
