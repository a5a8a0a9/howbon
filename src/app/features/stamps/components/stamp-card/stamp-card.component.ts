import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CelebrationService } from '@core/celebration/celebration.service';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { MAX_STAMP_NOTE_LENGTH, STAMPS_PER_BADGE } from '@shared/models/models';
import { AppDialogComponent } from '@shared/ui/app-dialog/app-dialog.component';
import { StampService } from '../../data-access/stamp.service';

@Component({
  selector: 'app-stamp-card',
  imports: [AppDialogComponent, FormsModule],
  templateUrl: './stamp-card.component.html',
  styleUrl: './stamp-card.component.scss',
})
export class StampCardComponent {
  protected readonly stamps = inject(StampService);
  protected readonly celebration = inject(CelebrationService);
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly stampSlots = Array.from({ length: STAMPS_PER_BADGE }, (_, index) => index);
  protected readonly stampsPerBadge = STAMPS_PER_BADGE;
  protected readonly maxNoteLength = MAX_STAMP_NOTE_LENGTH;
  protected readonly showNoteModal = signal(false);
  protected readonly showCelebration = signal(false);
  protected readonly unlockedBadgeOrdinal = signal<number | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected note = '';
  protected readonly progressLabel = computed(
    () => `目前有 ${this.stamps.currentStampCount()} 枚章，共需要 ${STAMPS_PER_BADGE} 枚`,
  );

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (this.showNoteModal() && !this.stamps.saving()) {
      this.closeNote();
    } else if (this.showCelebration()) {
      this.showCelebration.set(false);
    }
  }

  protected openNote(): void {
    this.note = '';
    this.submitError.set(null);
    this.showNoteModal.set(true);
  }

  protected closeNote(): void {
    if (this.stamps.saving()) {
      return;
    }
    this.showNoteModal.set(false);
  }

  protected async submitStamp(): Promise<void> {
    this.submitError.set(null);
    try {
      const result = await this.stamps.addStamp(this.note);
      this.showNoteModal.set(false);
      this.celebration.trigger();
      if (result.unlocked) {
        this.unlockedBadgeOrdinal.set(result.badgeOrdinal);
        this.showCelebration.set(true);
      }
    } catch (error: unknown) {
      this.submitError.set(error instanceof Error ? error.message : '蓋章失敗，請稍後重試。');
    }
  }
}
