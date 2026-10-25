import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { OrdersService } from '../../core/api/orders.service';
import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { ORDER_STATUS_LABELS, OrderStatus, OrderSummary, Shop } from '../../core/models';

@Component({
  selector: 'app-order-list',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './order-list.html',
})
export class OrderList implements OnInit {
  private readonly orders = inject(OrdersService);
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly rows = signal<OrderSummary[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly shopList = signal<Shop[]>([]);

  search = '';
  status: OrderStatus | null = null;
  shopId: number | null = null;

  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statuses: OrderStatus[] = ['NEW', 'PICKING', 'PACKED', 'SHIPPED', 'CANCELLED'];
  readonly isShop = this.auth.hasRole('SHOP');
  readonly canCreate = this.auth.hasRole('ADMIN', 'SHOP');
  readonly columns = ['externalRef', 'recipientName', 'status', 'itemCount', 'createdAt', 'actions'];

  ngOnInit(): void {
    if (!this.isShop) {
      this.shops.list().subscribe({
        next: (page) => this.shopList.set(page.data),
        error: (error) => this.notify.error(error),
      });
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.orders
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        q: this.search || undefined,
        status: this.status,
        shopId: this.shopId,
      })
      .subscribe({
        next: (result) => {
          this.rows.set(result.data);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.notify.error(error);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  create(): void {
    void this.router.navigate(['/zamowienia/nowe']);
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

}
