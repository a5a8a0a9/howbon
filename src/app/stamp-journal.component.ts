import { DatePipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectivityService } from './connectivity.service';
import { MAX_STAMP_NOTE_LENGTH, StampRecord } from './models';
import { StampService } from './stamp.service';

@Component({
  selector: 'app-stamp-journal',
  imports: [DatePipe, FormsModule],
  template: `
    <section class="journal" aria-labelledby="journal-title">
      <div class="section-heading">
        <div>
          <p>HOW BON JOURNAL</p>
          <h2 id="journal-title">集章日誌</h2>
        </div>
        <span>{{ stamps.stamps().length }} 筆紀錄</span>
      </div>

      @if (stamps.loading()) {
        <p class="empty">正在整理你的好棒時刻…</p>
      } @else if (stamps.stamps().length === 0) {
        <div class="empty-card">
          <span class="material-symbols-rounded" aria-hidden="true">notes</span>
          <h3>第一篇日誌等你寫下</h3>
          <p>每次蓋章都會留在這裡，沒有留言也沒關係。</p>
        </div>
      } @else {
        <ol class="timeline">
          @for (stamp of stamps.stamps(); track stamp.id; let index = $index) {
            <li>
              <div class="stamp-dot" aria-hidden="true">{{ stamps.stamps().length - index }}</div>
              <article>
                <time>{{ stamp.createdAt | date: 'yyyy/MM/dd HH:mm' }}</time>
                <p [class.no-note]="!stamp.note">
                  {{ stamp.note || '這次沒有留下文字，但進步已經被收藏。' }}
                </p>
                <button type="button" [disabled]="!connectivity.online()" (click)="openEdit(stamp)">
                  <span class="material-symbols-rounded" aria-hidden="true">edit</span> 編輯留言
                </button>
              </article>
            </li>
          }
        </ol>
      }
    </section>

    @if (editingStamp()) {
      <div class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-note-title">
          <h2 id="edit-note-title">編輯這次的留言</h2>
          <textarea [(ngModel)]="editNote" [maxLength]="maxNoteLength" rows="5"></textarea>
          <small>{{ editNote.length }} / {{ maxNoteLength }}；清空後仍會保留蓋章。</small>
          @if (editError()) {
            <p class="error" role="alert">{{ editError() }}</p>
          }
          <div class="actions">
            <button class="secondary" type="button" [disabled]="saving()" (click)="closeEdit()">
              取消
            </button>
            <button class="primary" type="button" [disabled]="saving()" (click)="saveEdit()">
              {{ saving() ? '儲存中…' : '儲存留言' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .journal {
      padding: clamp(30px, 5vw, 52px);
      border-radius: 26px;
      background: rgb(255 250 240 / 62%);
    }
    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgb(91 70 55 / 16%);
    }
    .section-heading p {
      margin: 0;
      color: #a84f42;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.16em;
    }
    h2 {
      margin: 8px 0 0;
      color: #49372e;
      font-size: clamp(1.8rem, 4vw, 2.5rem);
      letter-spacing: -0.04em;
    }
    .section-heading > span {
      color: #8d796d;
      font-size: 0.8rem;
    }
    .timeline {
      margin: 28px 0 0;
      padding: 0;
      list-style: none;
    }
    .timeline li {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 16px;
      position: relative;
      padding-bottom: 26px;
    }
    .timeline li:not(:last-child)::before {
      content: '';
      position: absolute;
      top: 42px;
      bottom: 0;
      left: 20px;
      width: 2px;
      background: #dfcfbd;
    }
    .stamp-dot {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 42px;
      aspect-ratio: 1;
      border: 2px solid #d06452;
      border-radius: 50%;
      background: #fffaf0;
      color: #c45848;
      font-size: 0.74rem;
      font-weight: 900;
      transform: rotate(-6deg);
    }
    article {
      padding: 16px 18px;
      border: 1px solid rgb(91 70 55 / 12%);
      border-radius: 16px;
      background: rgb(255 255 255 / 54%);
    }
    time {
      color: #927d71;
      font-size: 0.75rem;
    }
    article p {
      margin: 8px 0 14px;
      color: #554239;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    article p.no-note {
      color: #9a887d;
      font-style: italic;
    }
    article button {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 0;
      background: transparent;
      color: #557c6b;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
    }
    article button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .empty,
    .empty-card {
      color: #8b786c;
      text-align: center;
    }
    .empty {
      margin: 36px 0 0;
    }
    .empty-card {
      padding: 48px 20px 24px;
    }
    .empty-card > span {
      color: #c06050;
      font-size: 2.4rem;
    }
    .empty-card h3 {
      margin: 12px 0 6px;
      color: #544137;
    }
    .empty-card p {
      margin: 0;
    }
    .modal-backdrop {
      position: fixed;
      z-index: 35;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 22px;
      background: rgb(54 38 31 / 62%);
      backdrop-filter: blur(6px);
    }
    .modal {
      width: min(440px, 100%);
      padding: 34px;
      border-radius: 26px;
      background: #fffaf0;
      text-align: center;
    }
    .modal h2 {
      font-size: 1.8rem;
    }
    textarea {
      width: 100%;
      margin-top: 20px;
      resize: vertical;
      border: 1px solid #d3c2b3;
      border-radius: 14px;
      padding: 14px;
      background: #fffdf8;
      color: #493930;
      font: inherit;
    }
    small {
      display: block;
      margin-top: 7px;
      color: #9a877c;
      text-align: right;
    }
    .error {
      color: #a33b34;
      font-size: 0.84rem;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 22px;
    }
    .actions button {
      min-height: 46px;
      border: 0;
      border-radius: 12px;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .primary {
      background: #ca5948;
      color: white;
    }
    .secondary {
      background: #eee6d8;
      color: #57443a;
    }
  `,
})
export class StampJournalComponent {
  protected readonly stamps = inject(StampService);
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly editingStamp = signal<StampRecord | null>(null);
  protected readonly saving = signal(false);
  protected readonly editError = signal<string | null>(null);
  protected readonly maxNoteLength = MAX_STAMP_NOTE_LENGTH;
  protected editNote = '';

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (!this.saving()) this.closeEdit();
  }

  protected openEdit(stamp: StampRecord): void {
    this.editingStamp.set(stamp);
    this.editNote = stamp.note;
    this.editError.set(null);
  }

  protected closeEdit(): void {
    this.editingStamp.set(null);
  }

  protected async saveEdit(): Promise<void> {
    const stamp = this.editingStamp();
    if (!stamp) return;
    this.saving.set(true);
    this.editError.set(null);
    try {
      await this.stamps.updateStampNote(stamp.id, this.editNote);
      this.closeEdit();
    } catch (error: unknown) {
      this.editError.set(error instanceof Error ? error.message : '留言儲存失敗。');
    } finally {
      this.saving.set(false);
    }
  }
}
