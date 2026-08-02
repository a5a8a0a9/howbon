import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CelebrationService } from '@core/celebration/celebration.service';
import { ConnectivityService } from '@core/connectivity/connectivity.service';
import { StampService } from '../../data-access/stamp.service';
import HomePageComponent from './home-page.component';

describe('HomePageComponent', () => {
  it('restores the original title treatment and badge collection', async () => {
    const triggerCelebration = vi.fn();
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        {
          provide: StampService,
          useValue: {
            currentStampCount: signal(0),
            badgeCount: signal(3),
            saving: signal(false),
            addStamp: vi.fn(),
          },
        },
        { provide: CelebrationService, useValue: { trigger: triggerCelebration } },
        { provide: ConnectivityService, useValue: { online: signal(true) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('h1 em')?.textContent).toContain('好棒棒');
    expect(root.querySelector('.badge-art')).toBeTruthy();
    expect(root.querySelector('.badge-copy')?.textContent).toContain('3 枚');
    expect(root.querySelectorAll('.badge-total')).toHaveLength(0);

    root.querySelector('.title-celebration-trigger')?.dispatchEvent(new Event('pointerup'));
    root.querySelector('.badge-showcase')?.dispatchEvent(new Event('pointerup'));
    expect(triggerCelebration).toHaveBeenCalledTimes(2);
  });
});
