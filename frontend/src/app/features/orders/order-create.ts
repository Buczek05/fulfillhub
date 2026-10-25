import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { OrdersService } from '../../core/api/orders.service';
import { ProductsService } from '../../core/api/products.service';
import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { Product, Shop } from '../../core/models';

@Component({
  selector: 'app-order-create',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './order-create.html',
  styleUrl: './order-create.scss',
})
export class OrderCreate implements OnInit {
  private readonly orders = inject(OrdersService);
  private readonly products = inject(ProductsService);
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly shopList = signal<Shop[]>([]);
  readonly productList = signal<Product[]>([]);

  readonly isShop = this.auth.hasRole('SHOP');

  readonly form = this.fb.nonNullable.group({
    shopId: [this.auth.user()?.shopId ?? (null as number | null), [Validators.required]],
    externalRef: ['', [Validators.required, Validators.maxLength(64)]],
    recipientName: ['', [Validators.required]],
    recipientAddress: ['', [Validators.required]],
    recipientEmail: [''],
    items: this.fb.array([this.newItem()]),
  });

  get items(): FormArray {
    return this.form.controls.items;
  }

  ngOnInit(): void {
    if (!this.isShop) {
      this.shops.list().subscribe({
        next: (page) => this.shopList.set(page.data),
        error: (error) => this.notify.error(error),
      });
    }

    this.loadProducts();

    // Zmiana sklepu zmienia listę dostępnych produktów, więc pozycje trzeba wyczyścić.
    this.form.controls.shopId.valueChanges.subscribe(() => {
      this.items.clear();
      this.items.push(this.newItem());
      this.loadProducts();
    });
  }

  private loadProducts(): void {
    const shopId = this.form.controls.shopId.value;
    if (!shopId) {
      this.productList.set([]);
      return;
    }

    this.products.list({ pageSize: 100, shopId, sort: 'sku' }).subscribe({
      next: (page) => this.productList.set(page.data),
      error: (error) => this.notify.error(error),
    });
  }

  private newItem() {
    return this.fb.nonNullable.group({
      productId: [null as number | null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  addItem(): void {
    this.items.push(this.newItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  // Podgląd dostępności wybranego produktu, żeby nie składać zamówienia w ciemno.
  availableFor(index: number): Product | undefined {
    const productId = this.items.at(index).get('productId')?.value as number | null;

    return this.productList().find((product) => product.id === productId);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();

    this.orders
      .create({
        shopId: value.shopId!,
        externalRef: value.externalRef,
        recipientName: value.recipientName,
        recipientAddress: value.recipientAddress,
        recipientEmail: value.recipientEmail.trim() || null,
        items: (value.items as { productId: number; quantity: number }[]).map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
      .subscribe({
        next: (order) => {
          this.saving.set(false);
          this.notify.success('Zamówienie przyjęte, towar zarezerwowany.');
          void this.router.navigate(['/zamowienia', order.id]);
        },
        error: (error) => {
          this.saving.set(false);
          this.notify.error(error);
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/zamowienia']);
  }
}
