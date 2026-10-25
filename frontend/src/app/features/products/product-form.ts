import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProductsService } from '../../core/api/products.service';
import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { fieldErrors } from '../../core/api/api-error';
import { Shop } from '../../core/models';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './product-form.html',
})
export class ProductForm implements OnInit {
  private readonly products = inject(ProductsService);
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly productId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly shopList = signal<Shop[]>([]);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly isShop = this.auth.hasRole('SHOP');

  readonly form = inject(FormBuilder).nonNullable.group({
    shopId: [this.auth.user()?.shopId ?? (null as number | null), [Validators.required]],
    sku: ['', [Validators.required, Validators.maxLength(64)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    ean: [''],
    lowStockThreshold: [0, [Validators.required, Validators.min(0)]],
  });

  get isEdit(): boolean {
    return this.productId() !== null;
  }

  ngOnInit(): void {
    if (!this.isShop) {
      this.shops.list().subscribe({
        next: (page) => this.shopList.set(page.data),
        error: (error) => this.notify.error(error),
      });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.productId.set(Number(id));
    this.products.get(Number(id)).subscribe({
      next: (product) => {
        this.form.patchValue({
          shopId: product.shopId,
          sku: product.sku,
          name: product.name,
          ean: product.ean ?? '',
          lowStockThreshold: product.lowStockThreshold,
        });
        // SKU i sklep identyfikują towar w historii magazynu – po utworzeniu nie zmieniamy.
        this.form.controls.sku.disable();
        this.form.controls.shopId.disable();
      },
      error: (error) => {
        this.notify.error(error);
        void this.router.navigate(['/produkty']);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.serverErrors.set({});

    const value = this.form.getRawValue();
    const ean = value.ean.trim() === '' ? null : value.ean.trim();

    const request = this.isEdit
      ? this.products.update(this.productId()!, {
          name: value.name,
          ean,
          lowStockThreshold: value.lowStockThreshold,
        })
      : this.products.create({
          shopId: value.shopId!,
          sku: value.sku,
          name: value.name,
          ean,
          lowStockThreshold: value.lowStockThreshold,
        });

    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.notify.success(this.isEdit ? 'Produkt zapisany.' : 'Produkt dodany.');
        void this.router.navigate(['/produkty', product.id]);
      },
      error: (error) => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(error));
        this.notify.error(error);
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/produkty']);
  }
}
