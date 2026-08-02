import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ConnectivityService } from '../../../../core/connectivity/connectivity.service';
import { StampService } from '../../data-access/stamp.service';
import { StampCardComponent } from './stamp-card.component';

describe('StampCardComponent', () => {
  async function setup(unlocked = false): Promise<{
    fixture: ComponentFixture<StampCardComponent>;
    addStamp: ReturnType<typeof vi.fn>;
  }> {
    const addStamp = vi.fn().mockResolvedValue({
      unlocked,
      badgeOrdinal: unlocked ? 1 : null,
      currentStampCount: unlocked ? 0 : 1,
    });
    const stampStub = {
      currentStampCount: signal(unlocked ? 4 : 0),
      badgeCount: signal(0),
      saving: signal(false),
      addStamp,
    };
    await TestBed.configureTestingModule({
      imports: [StampCardComponent],
      providers: [
        { provide: StampService, useValue: stampStub },
        { provide: ConnectivityService, useValue: { online: signal(true) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(StampCardComponent);
    fixture.detectChanges();
    return { fixture, addStamp };
  }

  it('opens an optional note dialog before adding a stamp', async () => {
    const { fixture, addStamp } = await setup();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.stamp-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(root.querySelector('textarea')).toBeTruthy();
    expect(addStamp).not.toHaveBeenCalled();

    (root.querySelector('.dialog-card .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(addStamp).toHaveBeenCalledWith('');
  });

  it('shows a badge and ticket celebration after the fifth stamp', async () => {
    const { fixture } = await setup(true);
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.stamp-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.dialog-card .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('集滿了，好棒');
    expect(root.textContent).toContain('獲得一張');
  });
});
