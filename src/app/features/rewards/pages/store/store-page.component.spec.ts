import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ConnectivityService } from '../../../../core/connectivity/connectivity.service';
import { PurchaseService } from '../../data-access/purchase.service';
import { StoreService } from '../../data-access/store.service';
import { TicketService } from '../../data-access/ticket.service';
import StorePageComponent from './store-page.component';

describe('StorePageComponent', () => {
  it('shows hidden-price items and purchases through confirmation', async () => {
    const purchaseItem = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [StorePageComponent],
      providers: [
        { provide: ConnectivityService, useValue: { online: signal(true) } },
        {
          provide: StoreService,
          useValue: {
            items: signal([
              {
                id: 'item-1',
                name: '看一場電影',
                price: 1,
                createdAt: null,
                updatedAt: null,
              },
            ]),
            loading: signal(false),
            createItem: vi.fn(),
            renameItem: vi.fn(),
            deleteItem: vi.fn(),
          },
        },
        { provide: PurchaseService, useValue: { purchaseItem } },
        { provide: TicketService, useValue: { availableCount: signal(2) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(StorePageComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const itemCard = root.querySelector('.item-card')!;

    expect(itemCard.textContent).toContain('看一場電影');
    expect(itemCard.textContent).not.toContain('價格');
    expect(itemCard.textContent).not.toContain('$');
    expect(itemCard.querySelectorAll('.icon-button')).toHaveLength(2);

    (itemCard.querySelector('.purchase-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.dialog-card')?.textContent).toContain('購買「看一場電影」');

    (root.querySelector('.dialog-card .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(purchaseItem).toHaveBeenCalledWith('item-1');
  });

  it('disables purchasing without available tickets', async () => {
    await TestBed.configureTestingModule({
      imports: [StorePageComponent],
      providers: [
        { provide: ConnectivityService, useValue: { online: signal(true) } },
        {
          provide: StoreService,
          useValue: {
            items: signal([
              { id: 'item-1', name: '休息一下', price: 1, createdAt: null, updatedAt: null },
            ]),
            loading: signal(false),
          },
        },
        { provide: PurchaseService, useValue: { purchaseItem: vi.fn() } },
        { provide: TicketService, useValue: { availableCount: signal(0) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(StorePageComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.purchase-button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('票券不足');
  });
});
