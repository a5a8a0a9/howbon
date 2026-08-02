import { Injectable, computed, inject, signal } from '@angular/core';
import {
  User,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AppUserProfile } from '@shared/models/models';
import { getFirebaseServices, isFirebaseConfigured } from '@core/firebase/firebase-services';
import { LoadingService } from '@core/loading/loading.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly services = getFirebaseServices();
  private readonly loading = inject(LoadingService);
  private readonly firebaseUser = signal<User | null>(null);

  readonly configured = isFirebaseConfigured();
  readonly authReady = signal(!this.configured);
  readonly isSigningIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly user = computed<AppUserProfile | null>(() => {
    const user = this.firebaseUser();
    if (!user) {
      return null;
    }
    return {
      uid: user.uid,
      displayName: user.displayName?.trim() || '好棒夥伴',
      photoURL: user.photoURL,
    };
  });

  constructor() {
    if (!this.services) {
      return;
    }

    onAuthStateChanged(
      this.services.auth,
      async (user) => {
        this.firebaseUser.set(user);
        if (user && (typeof navigator === 'undefined' || navigator.onLine)) {
          try {
            await this.ensureProfile(user);
          } catch {
            this.error.set('帳號資料初始化失敗，請檢查 Firebase 設定後重試。');
          }
        }
        this.authReady.set(true);
      },
      () => {
        this.error.set('無法恢復登入狀態，請重新整理後再試。');
        this.authReady.set(true);
      },
    );
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.services || this.isSigningIn()) {
      return;
    }

    this.error.set(null);
    this.isSigningIn.set(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await this.loading.run('正在登入 Google 帳號…', () =>
        signInWithPopup(this.services!.auth, provider),
      );
    } catch (error: unknown) {
      const code = this.errorCode(error);
      this.error.set(
        code === 'auth/popup-closed-by-user'
          ? '登入視窗已關閉，你可以隨時再試一次。'
          : code === 'auth/popup-blocked'
            ? '瀏覽器阻擋了登入視窗，請允許彈出式視窗後重試。'
            : 'Google 登入失敗，請確認網路連線後重試。',
      );
    } finally {
      this.isSigningIn.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (!this.services) {
      return;
    }
    this.error.set(null);
    await this.loading.run('正在登出…', () => signOut(this.services!.auth));
  }

  clearError(): void {
    this.error.set(null);
  }

  private async ensureProfile(user: User): Promise<void> {
    if (!this.services) {
      return;
    }
    const profileRef = doc(this.services.firestore, 'users', user.uid);
    const snapshot = await getDoc(profileRef);
    if (snapshot.exists()) {
      await setDoc(
        profileRef,
        {
          displayName: user.displayName?.trim() || '好棒夥伴',
          photoURL: user.photoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }
    await setDoc(profileRef, {
      schemaVersion: 1,
      displayName: user.displayName?.trim() || '好棒夥伴',
      photoURL: user.photoURL,
      currentStampCount: 0,
      badgeCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private errorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return null;
    }
    return String((error as { code: unknown }).code);
  }
}
