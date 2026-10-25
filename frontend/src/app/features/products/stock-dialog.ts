import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { ProductsService } from '../../core/api/products.service';
import { NotifyService } from '../../core/notify.service';
import { Product } from '../../core/models';

export interface StockDialogData {
  product: Product;
  mode: 'receipt' | 'adjustment';
}

// Jedno okno dla przyjęcia i dla korekty – różnią się polem i endpointem.
@Component({
  selector: 'app-stock-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './stock-dialog.html',
})
export class StockDialog {
  private readonly products = inject(ProductsService);
  private readonly notify = inject(NotifyService);

  readonly dialogRef = inject(MatDialogRef<StockDialog, Product | undefined>);
  readonly data = inject<StockDialogData>(MAT_DIALOG_DATA);
  readonly saving = signal(false);

  readonly isReceipt = this.data.mode === 'receipt';

  readonly form = inject(FormBuilder).nonNullable.group({
    quantity: [1, [Validators.required, Validators.min(1)]],
    newQuantityOnHand: [this.data.product.quantityOnHand, [Validators.required, Validators.min(0)]],
    reason: ['', this.data.mode === 'adjustment' ? [Validators.required] : []],
  });

  submit(): void {
    if (this.saving()) return;

    const value = this.form.getRawValue();

    if (this.isReceipt && this.form.controls.quantity.invalid) return;
    if (!this.isReceipt && (this.form.controls.newQuantityOnHand.invalid || this.form.controls.reason.invalid)) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    const request = this.isReceipt
      ? this.products.receive(this.data.product.id, {
          quantity: value.quantity,
          reason: value.reason.trim() || undefined,
        })
      : this.products.adjust(this.data.product.id, {
          newQuantityOnHand: value.newQuantityOnHand,
          reason: value.reason.trim(),
        });

    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.notify.success(this.isReceipt ? 'Dostawa przyjęta.' : 'Stan skorygowany.');
        this.dialogRef.close(product);
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(error);
      },
    });
  }
}
