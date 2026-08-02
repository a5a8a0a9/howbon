import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { PurchaseService } from '../../data-access/purchase.service';

@Component({
  selector: 'app-rewards-page',
  imports: [DatePipe, EmptyStateComponent, PageHeaderComponent],
  templateUrl: './rewards-page.component.html',
  styleUrl: './rewards-page.component.scss',
})
export default class RewardsPageComponent {
  protected readonly purchases = inject(PurchaseService);
}
