import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PurchaseService } from '../../data-access/purchase.service';
import { TicketService } from '../../data-access/ticket.service';
import RewardsPageComponent from './rewards-page.component';

describe('RewardsPageComponent', () => {
  it('renders ticket balance and grouped inventory quantities', async () => {
    await TestBed.configureTestingModule({
      imports: [RewardsPageComponent],
      providers: [
        { provide: TicketService, useValue: { availableCount: signal(3) } },
        {
          provide: PurchaseService,
          useValue: {
            loading: signal(false),
            inventory: signal([
              {
                storeItemId: 'item-1',
                name: '看一場電影',
                quantity: 2,
                latestPurchasedAt: new Date(2026, 7, 2),
              },
            ]),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RewardsPageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.ticket-balance')?.textContent).toContain('3');
    expect(root.querySelector('.inventory-card')?.textContent).toContain('看一場電影');
    expect(root.querySelector('.inventory-card')?.textContent).toContain('× 2');
  });
});
