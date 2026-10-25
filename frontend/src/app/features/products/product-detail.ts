import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ProductsService } from '../../core/api/products.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { MOVEMENT_TYPE_LABELS, MovementType, Product, StockMovement } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { StockDialog } from './stock-dialog';

@Component({
  selector: 'app-product-detail',
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './product-detail.html',
})
export class ProductDetail implements OnInit {
  private readonly products = inject(ProductsService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly product = signal<Product | null>(null);
  readonly movements = signal<StockMovement[]>([]);
  readonly movementsTotal = signal(0);
  readonly movementsPage = signal(1);
  readonly movementsPageSize = signal(10);

  readonly movementLabels = MOVEMENT_TYPE_LABELS;
  readonly columns = ['createdAt', 'type', 'quantity', 'reason', 'orderId'];

  readonly canEdit = this.auth.hasRole('ADMIN', 'SHOP');
  readonly canMoveStock = this.auth.hasRole('ADMIN', 'WAREHOUSE');

  private productId = 0;

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
    this.loadMovements();
  }

  loadProduct(): void {
    this.products.get(this.productId).subscribe({
      next: (product) => this.product.set(product),
      error: (error) => {
        this.notify.error(error);
        void this.router.navigate(['/produkty']);
      },
    });
  }

  loadMovements(): void {
    this.products.movements(this.productId, this.movementsPage(), this.movementsPageSize()).subscribe({
      next: (page) => {
        this.movements.set(page.data);
        this.movementsTotal.set(page.total);
      },
      error: (error) => this.notify.error(error),
    });
  }

  onMovementsPage(event: PageEvent): void {
    this.movementsPage.set(event.pageIndex + 1);
    this.movementsPageSize.set(event.pageSize);
    this.loadMovements();
  }

  openStockDialog(mode: 'receipt' | 'adjustment'): void {
    const product = this.product();
    if (!product) return;

    this.dialog
      .open(StockDialog, { data: { product, mode }, width: '420px' })
      .afterClosed()
      .subscribe((updated) => {
        if (!updated) return;

        this.product.set(updated);
        this.loadMovements();
      });
  }

  remove(): void {
    const product = this.product();
    if (!product) return;

    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Usunąć produkt?',
          message: `Produkt ${product.sku} zostanie usunięty. Operacji nie da się cofnąć.`,
          confirmLabel: 'Usuń',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.products.remove(product.id).subscribe({
          next: () => {
            this.notify.success('Produkt usunięty.');
            void this.router.navigate(['/produkty']);
          },
          error: (error) => this.notify.error(error),
        });
      });
  }

  movementLabel(type: MovementType): string {
    return MOVEMENT_TYPE_LABELS[type];
  }

}
