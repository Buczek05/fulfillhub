import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { Shop } from '../../core/models';

@Component({
  selector: 'app-shop-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  templateUrl: './shop-dialog.html',
})
export class ShopDialog {
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);

  readonly dialogRef = inject(MatDialogRef<ShopDialog, boolean>);
  readonly shop = inject<Shop | null>(MAT_DIALOG_DATA);
  readonly saving = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.shop?.name ?? '', [Validators.required, Validators.maxLength(160)]],
    contactEmail: [this.shop?.contactEmail ?? '', [Validators.required, Validators.email]],
    isActive: [this.shop?.isActive ?? true],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();

    const request = this.shop
      ? this.shops.update(this.shop.id, value)
      : this.shops.create({ name: value.name, contactEmail: value.contactEmail });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(this.shop ? 'Sklep zapisany.' : 'Sklep dodany.');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(error);
      },
    });
  }
}
