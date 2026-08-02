import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectivityService } from '../../../../core/connectivity/connectivity.service';
import { MAX_STORE_ITEM_NAME_LENGTH, StoreItem } from '../../../../shared/models/models';
import { AppDialogComponent } from '../../../../shared/ui/app-dialog/app-dialog.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { TicketBalanceComponent } from '../../../../shared/ui/ticket-balance/ticket-balance.component';
import { PurchaseService } from '../../data-access/purchase.service';
import { StoreService } from '../../data-access/store.service';
import { TicketService } from '../../data-access/ticket.service';

@Component({
  selector: 'app-store-page',
  imports: [
    AppDialogComponent,
    EmptyStateComponent,
    FormsModule,
    PageHeaderComponent,
    TicketBalanceComponent,
  ],
  templateUrl: './store-page.component.html',
  styleUrl: './store-page.component.scss',
})
export default class StorePageComponent {
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly store = inject(StoreService);
  protected readonly purchases = inject(PurchaseService);
  protected readonly tickets = inject(TicketService);
  protected readonly maxNameLength = MAX_STORE_ITEM_NAME_LENGTH;
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingItem = signal<StoreItem | null>(null);
  protected readonly deletingItem = signal<StoreItem | null>(null);
  protected readonly purchasingItem = signal<StoreItem | null>(null);
  protected newItemName = '';
  protected editItemName = '';

  @HostListener('document:keydown.escape')
  protected escape(): void {
    this.closeDialogs();
  }

  protected async createItem(): Promise<void> {
    await this.run(async () => {
      await this.store.createItem(this.newItemName);
      this.newItemName = '';
    });
  }

  protected openEdit(item: StoreItem): void {
    this.formError.set(null);
    this.editItemName = item.name;
    this.editingItem.set(item);
  }

  protected async saveItem(): Promise<void> {
    const item = this.editingItem();
    if (!item) return;
    await this.run(async () => {
      await this.store.renameItem(item.id, this.editItemName);
      this.editingItem.set(null);
    });
  }

  protected async confirmDelete(): Promise<void> {
    const item = this.deletingItem();
    if (!item) return;
    await this.run(async () => {
      await this.store.deleteItem(item.id);
      this.deletingItem.set(null);
    });
  }

  protected async confirmPurchase(): Promise<void> {
    const item = this.purchasingItem();
    if (!item) return;
    await this.run(async () => {
      await this.purchases.purchaseItem(item.id);
      this.purchasingItem.set(null);
    });
  }

  protected openDelete(item: StoreItem): void {
    this.formError.set(null);
    this.deletingItem.set(item);
  }

  protected openPurchase(item: StoreItem): void {
    this.formError.set(null);
    this.purchasingItem.set(item);
  }

  protected closeDialogs(): void {
    if (this.busy()) return;
    this.editingItem.set(null);
    this.deletingItem.set(null);
    this.purchasingItem.set(null);
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
