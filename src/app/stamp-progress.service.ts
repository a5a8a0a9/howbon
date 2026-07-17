import { Injectable, computed, signal } from '@angular/core';

export const STAMP_STORAGE_KEY = 'howbon.stamp-progress.v1';
const STAMPS_PER_BADGE = 5;

export interface StampProgress {
  schemaVersion: 1;
  stampCount: number;
  badgeCount: number;
  updatedAt: string;
}

export interface AddStampResult {
  unlocked: boolean;
  progress: StampProgress;
}

@Injectable({ providedIn: 'root' })
export class StampProgressService {
  private readonly state = signal<StampProgress>(this.load());

  readonly stampCount = computed(() => this.state().stampCount);
  readonly badgeCount = computed(() => this.state().badgeCount);
  readonly remainingCount = computed(() => STAMPS_PER_BADGE - this.state().stampCount);

  addStamp(): AddStampResult {
    const current = this.state();
    const unlocked = current.stampCount === STAMPS_PER_BADGE - 1;
    const progress: StampProgress = {
      schemaVersion: 1,
      stampCount: unlocked ? 0 : current.stampCount + 1,
      badgeCount: current.badgeCount + (unlocked ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    this.save(progress);
    return { unlocked, progress };
  }

  reset(): void {
    this.save(this.createDefault());
  }

  private load(): StampProgress {
    try {
      const raw = localStorage.getItem(STAMP_STORAGE_KEY);
      if (!raw) {
        return this.createDefault();
      }

      const parsed: unknown = JSON.parse(raw);
      if (!this.isValid(parsed)) {
        localStorage.removeItem(STAMP_STORAGE_KEY);
        return this.createDefault();
      }

      return parsed;
    } catch {
      localStorage.removeItem(STAMP_STORAGE_KEY);
      return this.createDefault();
    }
  }

  private save(progress: StampProgress): void {
    this.state.set(progress);
    try {
      localStorage.setItem(STAMP_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // The current session remains usable when storage is unavailable.
    }
  }

  private createDefault(): StampProgress {
    return {
      schemaVersion: 1,
      stampCount: 0,
      badgeCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  private isValid(value: unknown): value is StampProgress {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<StampProgress>;
    return (
      candidate.schemaVersion === 1 &&
      Number.isInteger(candidate.stampCount) &&
      (candidate.stampCount ?? -1) >= 0 &&
      (candidate.stampCount ?? STAMPS_PER_BADGE) < STAMPS_PER_BADGE &&
      Number.isInteger(candidate.badgeCount) &&
      (candidate.badgeCount ?? -1) >= 0 &&
      typeof candidate.updatedAt === 'string' &&
      !Number.isNaN(Date.parse(candidate.updatedAt))
    );
  }
}
