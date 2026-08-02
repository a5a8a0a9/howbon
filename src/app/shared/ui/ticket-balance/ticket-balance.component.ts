import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ticket-balance',
  templateUrl: './ticket-balance.component.html',
  styleUrl: './ticket-balance.component.scss',
})
export class TicketBalanceComponent {
  readonly count = input.required<number>();
  readonly label = input('可用票券');
}
