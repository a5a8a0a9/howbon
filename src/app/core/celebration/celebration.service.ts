import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const CONFETTI_PIECE_COUNT = 14;
const CONFETTI_DURATION_MS = 2600;

@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private readonly document = inject(DOCUMENT);
  private burst = 0;
  private clearTimer: ReturnType<typeof setTimeout> | undefined;

  readonly pieces = signal<readonly number[]>([]);

  trigger(): void {
    if (this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.burst += 1;
    const firstPieceId = this.burst * CONFETTI_PIECE_COUNT;
    this.pieces.set(
      Array.from({ length: CONFETTI_PIECE_COUNT }, (_, index) => firstPieceId + index),
    );

    clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => this.pieces.set([]), CONFETTI_DURATION_MS);
  }
}
