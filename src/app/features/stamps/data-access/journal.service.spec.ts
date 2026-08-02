import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/auth/auth.service';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { describe, expect, it } from 'vitest';
import { JournalService, monthBounds, normalizeMonth, shiftMonth } from './journal.service';

describe('monthly journal helpers', () => {
  it('creates local-time inclusive and exclusive month boundaries', () => {
    const bounds = monthBounds(new Date(2025, 11, 20, 18, 30));

    expect(bounds.start).toEqual(new Date(2025, 11, 1));
    expect(bounds.end).toEqual(new Date(2026, 0, 1));
    expect(bounds.start.getHours()).toBe(0);
    expect(bounds.end.getHours()).toBe(0);
  });

  it('normalizes and shifts months across years', () => {
    expect(normalizeMonth(new Date(2026, 4, 31, 23, 59))).toEqual(new Date(2026, 4, 1));
    expect(shiftMonth(new Date(2026, 0, 10), -1)).toEqual(new Date(2025, 11, 1));
    expect(shiftMonth(new Date(2025, 11, 10), 1)).toEqual(new Date(2026, 0, 1));
  });
});

describe('JournalService navigation', () => {
  it('starts at the current month, blocks the future, and returns from the previous month', () => {
    TestBed.configureTestingModule({
      providers: [
        JournalService,
        {
          provide: AuthService,
          useValue: { user: signal(null) },
        },
        {
          provide: ConnectivityService,
          useValue: { online: signal(true) },
        },
      ],
    });
    const journal = TestBed.inject(JournalService);
    const current = normalizeMonth(new Date());

    expect(journal.selectedMonth()).toEqual(current);
    expect(journal.canGoNext()).toBe(false);
    journal.nextMonth();
    expect(journal.selectedMonth()).toEqual(current);

    journal.previousMonth();
    expect(journal.canGoNext()).toBe(true);
    journal.nextMonth();
    expect(journal.selectedMonth()).toEqual(current);
    expect(journal.canGoNext()).toBe(false);
  });
});
