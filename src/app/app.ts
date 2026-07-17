import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { StampProgressService } from './stamp-progress.service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swUpdate = inject(SwUpdate);
  protected readonly progress = inject(StampProgressService);

  protected readonly stampSlots = [0, 1, 2, 3, 4];
  protected readonly confettiPieces = Array.from({ length: 14 });
  protected readonly displayStampCount = signal(this.progress.stampCount());
  protected readonly lastStampedIndex = signal<number | null>(null);
  protected readonly isStamping = signal(false);
  protected readonly showCelebration = signal(false);
  protected readonly showResetConfirm = signal(false);
  protected readonly updateReady = signal(false);
  protected readonly installPrompt = signal<BeforeInstallPromptEvent | null>(null);
  protected readonly isInstalled = signal(this.isStandalone());
  protected readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  protected readonly showInstallHelp = signal(false);
  protected readonly progressLabel = computed(
    () => `已收集 ${this.displayStampCount()} 個印章，共需 5 個`,
  );

  private readonly celebrationCloseButton = viewChild<ElementRef<HTMLButtonElement>>('celebrationClose');
  private readonly resetCancelButton = viewChild<ElementRef<HTMLButtonElement>>('resetCancel');
  private animationTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => this.updateReady.set(true));
    }

    this.destroyRef.onDestroy(() => {
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
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

  @HostListener('document:keydown.escape')
  protected closeOverlays(): void {
    if (this.showCelebration()) {
      this.closeCelebration();
    } else if (this.showResetConfirm()) {
      this.cancelReset();
    } else if (this.showInstallHelp()) {
      this.showInstallHelp.set(false);
    }
  }

  protected addStamp(): void {
    if (this.isStamping()) {
      return;
    }

    this.isStamping.set(true);
    const previousCount = this.progress.stampCount();
    const result = this.progress.addStamp();
    this.lastStampedIndex.set(previousCount);
    this.displayStampCount.set(result.unlocked ? 5 : result.progress.stampCount);

    this.animationTimer = setTimeout(() => {
      this.lastStampedIndex.set(null);
      this.displayStampCount.set(result.progress.stampCount);
      this.isStamping.set(false);

      if (result.unlocked) {
        this.showCelebration.set(true);
        setTimeout(() => this.celebrationCloseButton()?.nativeElement.focus());
      }
    }, result.unlocked ? 760 : 540);
  }

  protected openResetConfirm(): void {
    this.showResetConfirm.set(true);
    setTimeout(() => this.resetCancelButton()?.nativeElement.focus());
  }

  protected cancelReset(): void {
    this.showResetConfirm.set(false);
  }

  protected confirmReset(): void {
    this.progress.reset();
    this.displayStampCount.set(0);
    this.lastStampedIndex.set(null);
    this.showResetConfirm.set(false);
  }

  protected closeCelebration(): void {
    this.showCelebration.set(false);
  }

  protected async installApp(): Promise<void> {
    const prompt = this.installPrompt();
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      this.installPrompt.set(null);
      return;
    }

    if (this.isIos) {
      this.showInstallHelp.set(true);
    }
  }

  protected async reloadForUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    this.document.location.reload();
  }

  private isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches;
  }
}
