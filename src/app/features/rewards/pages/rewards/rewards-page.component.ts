import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { TicketBalanceComponent } from '../../../../shared/ui/ticket-balance/ticket-balance.component';
import { PurchaseService } from '../../data-access/purchase.service';
import { TicketService } from '../../data-access/ticket.service';

@Component({
  selector: 'app-rewards-page',
  imports: [DatePipe, EmptyStateComponent, PageHeaderComponent, TicketBalanceComponent],
  templateUrl: './rewards-page.component.html',
  styleUrl: './rewards-page.component.scss',
})
export default class RewardsPageComponent {
  protected readonly purchases = inject(PurchaseService);
  protected readonly tickets = inject(TicketService);
}
