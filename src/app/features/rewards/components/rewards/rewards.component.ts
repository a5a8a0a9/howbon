import { DatePipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectivityService } from '../../../../core/connectivity/connectivity.service';
import { MAX_WISH_NAME_LENGTH, RewardTicket, RewardWish } from '../../../../shared/models/models';
import { AppDialogComponent } from '../../../../shared/ui/app-dialog/app-dialog.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { TicketBalanceComponent } from '../../../../shared/ui/ticket-balance/ticket-balance.component';
import { TicketService } from '../../data-access/ticket.service';
import { WishService } from '../../data-access/wish.service';

@Component({
  selector: 'app-rewards',
  imports: [
    AppDialogComponent,
    DatePipe,
    EmptyStateComponent,
    FormsModule,
    PageHeaderComponent,
    TicketBalanceComponent,
  ],
  templateUrl: './rewards.component.html',
  styleUrl: './rewards.component.scss',
})
export class RewardsComponent {
  protected readonly tickets = inject(TicketService);
  protected readonly wishes = inject(WishService);
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly maxWishLength = MAX_WISH_NAME_LENGTH;

  protected newWishName = '';
  protected editWishName = '';
  protected selectedWishId = '';
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingWish = signal<RewardWish | null>(null);
  protected readonly deletingWish = signal<RewardWish | null>(null);
  protected readonly redeemingTicket = signal<RewardTicket | null>(null);

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (this.busy()) return;
    this.editingWish.set(null);
    this.deletingWish.set(null);
    this.redeemingTicket.set(null);
    this.formError.set(null);
  }

  protected async addWish(): Promise<void> {
    await this.run(async () => {
      await this.wishes.createWish(this.newWishName);
      this.newWishName = '';
    });
  }

  protected openEdit(wish: RewardWish): void {
    this.editingWish.set(wish);
    this.editWishName = wish.name;
    this.formError.set(null);
  }

  protected async saveWish(): Promise<void> {
    const wish = this.editingWish();
    if (!wish) return;
    await this.run(async () => {
      await this.wishes.renameWish(wish.id, this.editWishName);
      this.editingWish.set(null);
    });
  }

  protected async confirmDeleteWish(): Promise<void> {
    const wish = this.deletingWish();
    if (!wish) return;
    await this.run(async () => {
      await this.wishes.deleteWish(wish.id);
      this.deletingWish.set(null);
    });
  }

  protected openRedeem(ticket: RewardTicket): void {
    this.redeemingTicket.set(ticket);
    this.selectedWishId = '';
    this.formError.set(null);
  }

  protected async confirmRedeem(): Promise<void> {
    const ticket = this.redeemingTicket();
    if (!ticket) return;
    const wish = this.wishes.wishes().find((item) => item.id === this.selectedWishId);
    await this.run(async () => {
      await this.tickets.redeemTicket(ticket.id, wish);
      this.redeemingTicket.set(null);
    });
  }

  protected closeDialogs(): void {
    if (this.busy()) return;
    this.editingWish.set(null);
    this.deletingWish.set(null);
    this.redeemingTicket.set(null);
    this.formError.set(null);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.formError.set(null);
    try {
      await action();
    } catch (error: unknown) {
      this.formError.set(error instanceof Error ? error.message : '操作失敗，請稍後重試。');
    } finally {
      this.busy.set(false);
    }
  }
}
