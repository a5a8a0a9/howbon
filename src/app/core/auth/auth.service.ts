import { Injectable, effect, inject, signal } from '@angular/core';
import { FirebaseAuthService } from '@a5a8a0a9/angular-firebase-core';
import { AppUserProfile } from '@shared/models/models';
import { LoadingService } from '@core/loading/loading.service';

/** App-facing facade for localized messages and the global loading UI. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly loading = inject(LoadingService);

  readonly configured = this.firebaseAuth.configured;
  readonly authReady = this.firebaseAuth.authReady;
  readonly isSigningIn = this.firebaseAuth.isSigningIn;
  readonly error = signal<string | null>(null);
  readonly user = this.firebaseAuth.user as () => AppUserProfile | null;

  constructor() {
    effect(() => {
      if (this.firebaseAuth.lastError()) {
        this.error.set('Firebase 登入或帳號資料同步失敗，請確認連線與 Firebase 設定。');
      }
    });
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.configured || this.isSigningIn()) {
      return;
    }

    this.error.set(null);
    try {
      await this.loading.run('正在登入 Google 帳號…', () => this.firebaseAuth.signInWithGoogle());
    } catch (error: unknown) {
      const code = this.errorCode(error);
      this.error.set(
        code === 'auth/popup-closed-by-user'
          ? '登入視窗已關閉。'
          : code === 'auth/popup-blocked'
            ? '登入視窗遭瀏覽器封鎖，請允許彈出式視窗後再試一次。'
            : 'Google 登入失敗，請稍後再試。',
      );
    }
  }

  async signOut(): Promise<void> {
    if (!this.configured) {
      return;
    }
    this.error.set(null);
    await this.loading.run('正在登出…', () => this.firebaseAuth.signOut());
  }

  clearError(): void {
    this.error.set(null);
    this.firebaseAuth.clearError();
  }

  private errorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return null;
    }
    return String((error as { code: unknown }).code);
  }
}
