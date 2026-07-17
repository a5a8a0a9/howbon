import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { EMPTY } from 'rxjs';
import { App } from './app';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('App', () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
    });
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: EMPTY,
            activateUpdate: () => Promise.resolve(true),
          },
        },
      ],
    }).compileComponents();
  });

  it('creates the app and renders the product heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('今天也要');
    expect(compiled.querySelector('.round-count')?.textContent).toContain('0/ 5');
  });

  it('adds a stamp when the primary button is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.stamp-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.stamp-slot.is-filled')).toHaveLength(1);
  });
});
