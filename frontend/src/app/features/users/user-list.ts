import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { UsersService } from '../../core/api/users.service';
import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { ROLE_LABELS, Role, Shop, User } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { UserDialog } from './user-dialog';

@Component({
  selector: 'app-user-list',
  imports: [
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './user-list.html',
})
export class UserList implements OnInit {
  private readonly users = inject(UsersService);
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<User[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly shopList = signal<Shop[]>([]);

  search = '';
  role: Role | null = null;

  readonly roleLabels = ROLE_LABELS;
  readonly roles: Role[] = ['ADMIN', 'WAREHOUSE', 'SHOP'];
  readonly columns = ['email', 'role', 'shop', 'isActive', 'actions'];

  ngOnInit(): void {
    this.shops.list().subscribe({
      next: (page) => this.shopList.set(page.data),
      error: (error) => this.notify.error(error),
    });

    this.load();
  }

  load(): void {
    this.users.list(this.page(), this.pageSize(), this.role, this.search || undefined).subscribe({
      next: (result) => {
        this.rows.set(result.data);
        this.total.set(result.total);
      },
      error: (error) => this.notify.error(error),
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

  shopName(shopId: number | null): string {
    if (!shopId) return '—';

    return this.shopList().find((shop) => shop.id === shopId)?.name ?? `#${shopId}`;
  }

  openDialog(user?: User): void {
    this.dialog
      .open(UserDialog, { data: { user: user ?? null, shops: this.shopList() }, width: '440px' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  deactivate(user: User): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Dezaktywować konto?',
          message: `Konto ${user.email} przestanie się logować. Zostaje w historii ruchów magazynowych.`,
          confirmLabel: 'Dezaktywuj',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.users.deactivate(user.id).subscribe({
          next: () => {
            this.notify.success('Konto dezaktywowane.');
            this.load();
          },
          error: (error) => this.notify.error(error),
        });
      });
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

}
