import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { OrdersService } from '../../core/api/orders.service';
import { NotifyService } from '../../core/notify.service';
import { Order } from '../../core/models';

@Component({
  selector: 'app-ship-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './ship-dialog.html',
})
export class ShipDialog {
  private readonly orders = inject(OrdersService);
  private readonly notify = inject(NotifyService);

  readonly dialogRef = inject(MatDialogRef<ShipDialog, Order | undefined>);
  readonly order = inject<Order>(MAT_DIALOG_DATA);
  readonly saving = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    carrier: ['InPost', [Validators.required]],
    trackingNumber: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    this.orders.ship(this.order.id, this.form.getRawValue()).subscribe({
      next: (order) => {
        this.saving.set(false);
        this.notify.success('Zamówienie wysłane, stan magazynowy zaktualizowany.');
        this.dialogRef.close(order);
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(error);
      },
    });
  }
}
