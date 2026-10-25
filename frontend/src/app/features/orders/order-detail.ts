import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { OrdersService } from '../../core/api/orders.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { ORDER_STATUS_LABELS, Order } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { ShipDialog } from './ship-dialog';

@Component({
  selector: 'app-order-detail',
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly orders = inject(OrdersService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly order = signal<Order | null>(null);
  readonly busy = signal(false);
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly columns = ['sku', 'name', 'quantity'];

  readonly canProcess = this.auth.hasRole('ADMIN', 'WAREHOUSE');
  private readonly isShop = this.auth.hasRole('SHOP');

  ngOnInit(): void {
    this.load(Number(this.route.snapshot.paramMap.get('id')));
  }

  private load(id: number): void {
    this.orders.get(id).subscribe({
      next: (order) => this.order.set(order),
      error: (error) => {
        this.notify.error(error);
        void this.router.navigate(['/zamowienia']);
      },
    });
  }

  // Przyciski pokazujemy zgodnie ze state machine backendu.
  get canPick(): boolean {
    return this.canProcess && this.order()?.status === 'NEW';
  }

  get canPack(): boolean {
    return this.canProcess && this.order()?.status === 'PICKING';
  }

  get canShip(): boolean {
    return this.canProcess && this.order()?.status === 'PACKED';
  }

  get canCancel(): boolean {
    const status = this.order()?.status;
    if (!status || status === 'SHIPPED' || status === 'CANCELLED') return false;

    // Sklep może anulować tylko zanim magazyn ruszy z kompletacją.
    return this.isShop ? status === 'NEW' : true;
  }

  changeStatus(status: 'PICKING' | 'PACKED'): void {
    const order = this.order();
    if (!order || this.busy()) return;

    this.busy.set(true);
    this.orders.changeStatus(order.id, status).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.order.set(updated);
        this.notify.success(`Status zmieniony na: ${this.statusLabels[updated.status]}.`);
      },
      error: (error) => {
        this.busy.set(false);
        this.notify.error(error);
      },
    });
  }

  ship(): void {
    const order = this.order();
    if (!order) return;

    this.dialog
      .open(ShipDialog, { data: order, width: '420px' })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) this.order.set(updated);
      });
  }

  cancel(): void {
    const order = this.order();
    if (!order) return;

    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Anulować zamówienie?',
          message: `Zamówienie ${order.externalRef} zostanie anulowane, a zarezerwowany towar wróci do puli dostępnej.`,
          confirmLabel: 'Anuluj zamówienie',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.orders.cancel(order.id).subscribe({
          next: (updated) => {
            this.order.set(updated);
            this.notify.success('Zamówienie anulowane, rezerwacja zwolniona.');
          },
          error: (error) => this.notify.error(error),
        });
      });
  }
}
