import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly destroyRef = inject(DestroyRef);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const markOnline = () => this.online.set(true);
    const markOffline = () => this.online.set(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    });
  }
}
