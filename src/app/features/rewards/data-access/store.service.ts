import { Injectable, effect, inject, signal } from '@angular/core';
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
import { AuthService } from '../../../core/auth/auth.service';
import { ConnectivityService } from '../../../core/connectivity/connectivity.service';
import { getFirebaseServices } from '../../../core/firebase/firebase-services';
import { LoadingService } from '../../../core/loading/loading.service';
import { MAX_STORE_ITEM_NAME_LENGTH, StoreItem, toDate } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly services = getFirebaseServices();
  private readonly globalLoading = inject(LoadingService);
  private readonly itemState = signal<StoreItem[]>([]);

  readonly items = this.itemState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly auth: AuthService,
    private readonly connectivity: ConnectivityService,
  ) {
    effect((onCleanup) => {
      const user = this.auth.user();
      this.itemState.set([]);
      this.error.set(null);
      if (!user || !this.services) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const itemQuery = query(
        collection(this.services.firestore, 'users', user.uid, 'storeItems'),
        orderBy('createdAt', 'desc'),
      );
      const unsubscribe = onSnapshot(
        itemQuery,
        (snapshot) => {
          this.itemState.set(
            snapshot.docs.map((entry) => {
              const data = entry.data();
              return {
                id: entry.id,
                name: String(data['name'] ?? ''),
                price: Number(data['price'] ?? 1),
                createdAt: toDate(data['createdAt']),
                updatedAt: toDate(data['updatedAt']),
              };
            }),
          );
          this.loading.set(false);
        },
        () => {
          this.error.set('無法讀取商店商品，請稍後重試。');
          this.loading.set(false);
        },
      );
      onCleanup(unsubscribe);
    });
  }

  async createItem(name: string): Promise<void> {
    const user = this.requireWritableUser();
    const cleanName = this.validateName(name);
    await this.globalLoading.run('正在新增商品…', () =>
      addDoc(collection(this.services!.firestore, 'users', user.uid, 'storeItems'), {
        name: cleanName,
        price: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  }

  async renameItem(itemId: string, name: string): Promise<void> {
    const user = this.requireWritableUser();
    const cleanName = this.validateName(name);
    await this.globalLoading.run('正在修改商品…', () =>
      updateDoc(doc(this.services!.firestore, 'users', user.uid, 'storeItems', itemId), {
        name: cleanName,
        updatedAt: serverTimestamp(),
      }),
    );
  }

  async deleteItem(itemId: string): Promise<void> {
    const user = this.requireWritableUser();
    await this.globalLoading.run('正在刪除商品…', () =>
      deleteDoc(doc(this.services!.firestore, 'users', user.uid, 'storeItems', itemId)),
    );
  }

  private validateName(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('請輸入商品名稱。');
    }
    if (cleanName.length > MAX_STORE_ITEM_NAME_LENGTH) {
      throw new Error(`商品名稱最多 ${MAX_STORE_ITEM_NAME_LENGTH} 個字。`);
    }
    return cleanName;
  }

  private requireWritableUser(): { uid: string } {
    const user = this.auth.user();
    if (!user || !this.services) {
      throw new Error('請先登入並完成 Firebase 設定。');
    }
    if (!this.connectivity.online()) {
      throw new Error('目前離線，連線後才能修改商店。');
    }
    return user;
  }
}
