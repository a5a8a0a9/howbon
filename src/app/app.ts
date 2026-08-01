import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AuthService } from './auth.service';
import { ConnectivityService } from './connectivity.service';
import { LoginComponent } from './login.component';
import { RewardsComponent } from './rewards.component';
import { StampCardComponent } from './stamp-card.component';
import { StampJournalComponent } from './stamp-journal.component';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  imports: [LoginComponent, RewardsComponent, StampCardComponent, StampJournalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swUpdate = inject(SwUpdate);
  protected readonly auth = inject(AuthService);
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly updateReady = signal(false);
  protected readonly installPrompt = signal<BeforeInstallPromptEvent | null>(null);
  protected readonly isInstalled = signal(this.isStandalone());
  protected readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  protected readonly showInstallHelp = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => this.updateReady.set(true));
    }
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
