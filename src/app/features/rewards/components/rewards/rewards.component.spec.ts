import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ConnectivityService } from '../../../../core/connectivity/connectivity.service';
import { TicketService } from '../../data-access/ticket.service';
import { WishService } from '../../data-access/wish.service';
import { RewardsComponent } from './rewards.component';

describe('RewardsComponent', () => {
  it('creates reusable wishes and offers free redemption', async () => {
    const createWish = vi.fn().mockResolvedValue(undefined);
    const redeemTicket = vi.fn().mockResolvedValue(undefined);
    const wishes = signal([{ id: 'wish-1', name: '吃大餐', createdAt: null, updatedAt: null }]);
    const availableTickets = signal([
      {
        id: 'badge-1',
        badgeOrdinal: 1,
        status: 'available',
        wishId: null,
        rewardNameSnapshot: null,
        createdAt: null,
        redeemedAt: null,
      },
    ]);
    await TestBed.configureTestingModule({
      imports: [RewardsComponent],
      providers: [
        { provide: ConnectivityService, useValue: { online: signal(true) } },
        {
          provide: WishService,
          useValue: { wishes, createWish, renameWish: vi.fn(), deleteWish: vi.fn() },
        },
        {
          provide: TicketService,
          useValue: { availableTickets, redeemedTickets: signal([]), redeemTicket },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RewardsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    (fixture.componentInstance as unknown as { newWishName: string }).newWishName = '看一場電影';
    fixture.detectChanges();
    (root.querySelector('.wish-form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(createWish).toHaveBeenCalledWith('看一場電影');

    (root.querySelector('.ticket button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const select = root.querySelector('#wish-select') as HTMLSelectElement;
    expect(select.options[0]?.textContent).toContain('自由兌換');
  });
});
