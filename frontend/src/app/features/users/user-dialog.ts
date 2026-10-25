import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { UsersService } from '../../core/api/users.service';
import { NotifyService } from '../../core/notify.service';
import { ROLE_LABELS, Role, Shop, User } from '../../core/models';

export interface UserDialogData {
  user: User | null;
  shops: Shop[];
}

@Component({
  selector: 'app-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  templateUrl: './user-dialog.html',
})
export class UserDialog {
  private readonly users = inject(UsersService);
  private readonly notify = inject(NotifyService);

  readonly dialogRef = inject(MatDialogRef<UserDialog, boolean>);
  readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);
  readonly saving = signal(false);

  readonly roleLabels = ROLE_LABELS;
  readonly roles: Role[] = ['ADMIN', 'WAREHOUSE', 'SHOP'];
  readonly isEdit = this.data.user !== null;

  readonly form = inject(FormBuilder).nonNullable.group({
    email: [this.data.user?.email ?? '', [Validators.required, Validators.email]],
    // Przy edycji hasło jest opcjonalne – puste pole znaczy „nie zmieniaj”.
    password: ['', this.data.user ? [] : [Validators.required, Validators.minLength(8)]],
    role: [this.data.user?.role ?? ('SHOP' as Role), [Validators.required]],
    shopId: [this.data.user?.shopId ?? (null as number | null)],
    isActive: [this.data.user?.isActive ?? true],
  });

  get needsShop(): boolean {
    return this.form.controls.role.value === 'SHOP';
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    if (this.needsShop && !value.shopId) {
      this.form.controls.shopId.setErrors({ required: true });
      this.form.controls.shopId.markAsTouched();
      return;
    }

    this.saving.set(true);
    const shopId = this.needsShop ? value.shopId : null;

    const request = this.data.user
      ? this.users.update(this.data.user.id, {
          email: value.email,
          role: value.role,
          shopId,
          isActive: value.isActive,
          ...(value.password ? { password: value.password } : {}),
        })
      : this.users.create({
          email: value.email,
          password: value.password,
          role: value.role,
          ...(shopId ? { shopId } : {}),
        });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(this.isEdit ? 'Konto zapisane.' : 'Konto utworzone.');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving.set(false);
        this.notify.error(error);
      },
    });
  }
}
