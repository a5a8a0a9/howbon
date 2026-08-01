import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectivityService } from './connectivity.service';
import { MAX_STAMP_NOTE_LENGTH, STAMPS_PER_BADGE } from './models';
import { StampService } from './stamp.service';

@Component({
  selector: 'app-stamp-card',
  imports: [FormsModule],
  template: `
    <section class="stamp-card" aria-labelledby="stamp-card-title">
      <span class="tape tape-left" aria-hidden="true"></span>
      <span class="tape tape-right" aria-hidden="true"></span>
      <div class="card-heading">
        <div>
          <p>MY HOW BON CARD</p>
          <h2 id="stamp-card-title">今天的集章卡</h2>
        </div>
        <div class="round-count" [attr.aria-label]="progressLabel()">
          <strong>{{ stamps.currentStampCount() }}</strong
          ><span>/ {{ stampsPerBadge }}</span>
        </div>
      </div>

      <div class="stamp-grid" role="img" [attr.aria-label]="progressLabel()">
        @for (slot of stampSlots; track slot) {
          <div
            class="stamp-slot"
            [class.is-filled]="slot < stamps.currentStampCount()"
            aria-hidden="true"
          >
            @if (slot < stamps.currentStampCount()) {
              <div class="stamp-ink">
                <span class="material-symbols-rounded">auto_awesome</span>
                <b>好棒</b>
              </div>
            } @else {
              <span>0{{ slot + 1 }}</span>
            }
          </div>
        }
      </div>

      <p class="progress-copy">
        @if (stamps.currentStampCount() === 0) {
          從今天的一件小事開始吧
        } @else {
          再 {{ stampsPerBadge - stamps.currentStampCount() }} 枚章，就能獲得徽章與票券
        }
      </p>
      <button
        class="stamp-button"
        type="button"
        [disabled]="!connectivity.online() || stamps.saving()"
        (click)="openNote()"
      >
        <span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span>
        <span>{{ connectivity.online() ? '蓋一個好棒章' : '連線後才能蓋章' }}</span>
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
      <p class="badge-total">已收藏 {{ stamps.badgeCount() }} 枚徽章</p>
    </section>

    @if (showNoteModal()) {
      <div class="modal-backdrop" (click)="backdropClose($event)">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="note-title">
          <button class="icon-close" type="button" aria-label="關閉" (click)="closeNote()">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
          <p class="modal-kicker">NEW STAMP</p>
          <h2 id="note-title">這次想記下什麼？</h2>
          <p>留言可以留白，之後也能在集章日誌中修改。</p>
          <textarea
            name="stampNote"
            [(ngModel)]="note"
            [maxLength]="maxNoteLength"
            rows="5"
            placeholder="例如：完成了拖很久的報告！"
            [disabled]="stamps.saving()"
          ></textarea>
          <div class="field-meta">
            <span>{{ note.length }} / {{ maxNoteLength }}</span>
          </div>
          @if (submitError()) {
            <p class="form-error" role="alert">{{ submitError() }}</p>
          }
          <div class="modal-actions">
            <button
              class="secondary"
              type="button"
              [disabled]="stamps.saving()"
              (click)="closeNote()"
            >
              取消
            </button>
            <button
              class="primary"
              type="button"
              [disabled]="stamps.saving()"
              (click)="submitStamp()"
            >
              {{ stamps.saving() ? '正在蓋章…' : '確認蓋章' }}
            </button>
          </div>
        </section>
      </div>
    }

    @if (showCelebration()) {
      <div class="modal-backdrop celebration">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
          <div class="mini-badge" aria-hidden="true">
            <span class="material-symbols-rounded">celebration</span>
          </div>
          <p class="modal-kicker">NEW BADGE & TICKET</p>
          <h2 id="celebration-title">集滿了，好棒！</h2>
          <p>
            第 {{ unlockedBadgeOrdinal() }} 枚徽章已收藏，也獲得一張可以自由兌換或選擇願望的票券。
          </p>
          <button class="primary wide" type="button" (click)="showCelebration.set(false)">
            收下獎勵
          </button>
        </section>
      </div>
    }
  `,
  styleUrl: './stamp-card.component.css',
})
export class StampCardComponent {
  protected readonly stamps = inject(StampService);
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
    this.showNoteModal.set(false);
  }

  protected backdropClose(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.stamps.saving()) {
      this.closeNote();
    }
  }

  protected async submitStamp(): Promise<void> {
    this.submitError.set(null);
    try {
      const result = await this.stamps.addStamp(this.note);
      this.showNoteModal.set(false);
      if (result.unlocked) {
        this.unlockedBadgeOrdinal.set(result.badgeOrdinal);
        this.showCelebration.set(true);
      }
    } catch (error: unknown) {
      this.submitError.set(error instanceof Error ? error.message : '蓋章失敗，請稍後重試。');
    }
  }
}
