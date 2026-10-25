import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ProductsService } from '../../core/api/products.service';
import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { Product, Shop } from '../../core/models';

@Component({
  selector: 'app-product-list',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './product-list.html',
})
export class ProductList implements OnInit {
  private readonly products = inject(ProductsService);
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rows = signal<Product[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly shopList = signal<Shop[]>([]);

  search = '';
  shopId: number | null = null;
  lowStock = false;

  readonly canEdit = this.auth.hasRole('ADMIN', 'SHOP');
  readonly isShop = this.auth.hasRole('SHOP');
  readonly columns = ['sku', 'name', 'quantityOnHand', 'quantityReserved', 'quantityAvailable', 'actions'];

  ngOnInit(): void {
    // Pulpit linkuje tu z filtrem „niski stan”.
    this.lowStock = this.route.snapshot.queryParamMap.get('niskiStan') === 'tak';

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

    this.products
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        q: this.search || undefined,
        shopId: this.shopId,
        lowStock: this.lowStock,
        sort: 'sku',
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

  add(): void {
    void this.router.navigate(['/produkty/nowy']);
  }
}
