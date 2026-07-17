import { TestBed } from '@angular/core/testing';
import { STAMP_STORAGE_KEY, StampProgressService } from './stamp-progress.service';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('StampProgressService', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function createService(): StampProgressService {
    TestBed.configureTestingModule({});
    return TestBed.inject(StampProgressService);
  }

  it('adds one stamp and persists it', () => {
    const service = createService();
    const result = service.addStamp();

    expect(result.unlocked).toBe(false);
    expect(service.stampCount()).toBe(1);
    expect(JSON.parse(localStorage.getItem(STAMP_STORAGE_KEY) ?? '{}').stampCount).toBe(1);
  });

  it('unlocks exactly one badge on the fifth stamp and starts a new card', () => {
    const service = createService();

    for (let index = 0; index < 4; index += 1) {
      expect(service.addStamp().unlocked).toBe(false);
    }
    expect(service.addStamp().unlocked).toBe(true);

    expect(service.stampCount()).toBe(0);
    expect(service.badgeCount()).toBe(1);
  });

  it('keeps counting badges across multiple rounds', () => {
    const service = createService();

    for (let index = 0; index < 10; index += 1) {
      service.addStamp();
    }

    expect(service.stampCount()).toBe(0);
    expect(service.badgeCount()).toBe(2);
  });

  it('restores valid saved progress', () => {
    localStorage.setItem(
      STAMP_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        stampCount: 3,
        badgeCount: 2,
        updatedAt: new Date().toISOString(),
      }),
    );

    const service = createService();

    expect(service.stampCount()).toBe(3);
    expect(service.badgeCount()).toBe(2);
  });

  it('falls back safely when saved progress is invalid', () => {
    localStorage.setItem(
      STAMP_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, stampCount: 99, badgeCount: -4, updatedAt: 'nope' }),
    );

    const service = createService();

    expect(service.stampCount()).toBe(0);
    expect(service.badgeCount()).toBe(0);
    expect(localStorage.getItem(STAMP_STORAGE_KEY)).toBeNull();
  });

  it('resets all progress after confirmation is handled by the UI', () => {
    const service = createService();
    service.addStamp();
    service.reset();

    expect(service.stampCount()).toBe(0);
    expect(service.badgeCount()).toBe(0);
  });
});
