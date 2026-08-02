import { DatePipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { MAX_STAMP_NOTE_LENGTH, StampRecord } from '@shared/models/models';
import { AppDialogComponent } from '@shared/ui/app-dialog/app-dialog.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { JournalService } from '../../data-access/journal.service';

@Component({
  selector: 'app-stamp-journal',
  imports: [AppDialogComponent, DatePipe, EmptyStateComponent, FormsModule, PageHeaderComponent],
  templateUrl: './stamp-journal.component.html',
  styleUrl: './stamp-journal.component.scss',
})
export class StampJournalComponent {
  protected readonly journal = inject(JournalService);
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
      await this.journal.updateNote(stamp.id, this.editNote);
      this.closeEdit();
    } catch (error: unknown) {
      this.editError.set(error instanceof Error ? error.message : '留言儲存失敗。');
    } finally {
      this.saving.set(false);
    }
  }
}
