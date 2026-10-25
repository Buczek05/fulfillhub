import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ShopsService } from '../../core/api/shops.service';
import { NotifyService } from '../../core/notify.service';
import { AuthService } from '../../core/auth/auth.service';
import { Shop } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { ShopDialog } from './shop-dialog';

@Component({
  selector: 'app-shop-list',
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './shop-list.html',
})
export class ShopList implements OnInit {
  private readonly shops = inject(ShopsService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Shop[]>([]);
  readonly isAdmin = this.auth.hasRole('ADMIN');

  get columns(): string[] {
    return this.isAdmin
      ? ['name', 'contactEmail', 'isActive', 'actions']
      : ['name', 'contactEmail', 'isActive'];
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.shops.list().subscribe({
      next: (page) => this.rows.set(page.data),
      error: (error) => this.notify.error(error),
    });
  }

  openDialog(shop?: Shop): void {
    this.dialog
      .open(ShopDialog, { data: shop ?? null, width: '420px' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  remove(shop: Shop): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Usunąć sklep?',
          message: `Sklep ${shop.name} zostanie usunięty. Możliwe tylko wtedy, gdy nie ma produktów ani zamówień.`,
          confirmLabel: 'Usuń',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.shops.remove(shop.id).subscribe({
          next: () => {
            this.notify.success('Sklep usunięty.');
            this.load();
          },
          error: (error) => this.notify.error(error),
        });
      });
  }
}
