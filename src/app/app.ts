import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { CelebrationService } from './core/celebration/celebration.service';
import { ConnectivityService } from './core/connectivity/connectivity.service';
import { LoadingService } from './core/loading/loading.service';
import { LoginComponent } from './features/auth/login/login.component';
import { AppDialogComponent } from './shared/ui/app-dialog/app-dialog.component';
import { BottomNavComponent } from './shared/ui/bottom-nav/bottom-nav.component';
import { LoadingMaskComponent } from './shared/ui/loading-mask/loading-mask.component';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  imports: [
    AppDialogComponent,
    BottomNavComponent,
    LoginComponent,
    LoadingMaskComponent,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swUpdate = inject(SwUpdate);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly celebration = inject(CelebrationService);
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly loading = inject(LoadingService);
  protected readonly updateReady = signal(false);
  protected readonly installPrompt = signal<BeforeInstallPromptEvent | null>(null);
  protected readonly isInstalled = signal(this.isStandalone());
  protected readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  protected readonly showInstallHelp = signal(false);
  private routeLoadingId: number | null = null;

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => this.updateReady.set(true));
    }

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (this.routeLoadingId !== null) {
          this.loading.end(this.routeLoadingId);
        }
        this.routeLoadingId = this.loading.begin('正在切換頁面…');
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.routeLoadingId !== null) {
          this.loading.end(this.routeLoadingId);
          this.routeLoadingId = null;
        }
      }
    });
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  protected captureInstallPrompt(event: Event): void {
    event.preventDefault();
    this.installPrompt.set(event as BeforeInstallPromptEvent);
  }

  @HostListener('window:appinstalled')
  protected markInstalled(): void {
    this.installPrompt.set(null);
    this.isInstalled.set(true);
  }

  protected async installApp(): Promise<void> {
    const prompt = this.installPrompt();
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      this.installPrompt.set(null);
    } else if (this.isIos) {
      this.showInstallHelp.set(true);
    }
  }

  protected async reloadForUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    this.document.location.reload();
  }

  private isStandalone(): boolean {
    return typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  }
}
