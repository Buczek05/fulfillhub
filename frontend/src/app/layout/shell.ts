import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../core/auth/auth.service';
import { ROLE_LABELS, Role } from '../core/models';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: Role[];
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly roleLabels = ROLE_LABELS;

  // Menu zależne od roli. Backend i tak egzekwuje uprawnienia – to tylko wygoda.
  private readonly items: NavItem[] = [
    { path: '/pulpit', label: 'Pulpit', icon: 'dashboard' },
    { path: '/produkty', label: 'Produkty', icon: 'inventory_2' },
    { path: '/zamowienia', label: 'Zamówienia', icon: 'local_shipping' },
    { path: '/sklepy', label: 'Sklepy', icon: 'storefront' },
    { path: '/uzytkownicy', label: 'Użytkownicy', icon: 'group', roles: ['ADMIN'] },
  ];

  get navItems(): NavItem[] {
    return this.items.filter((item) => !item.roles || this.auth.hasRole(...item.roles));
  }

  logout(): void {
    this.auth.logout();
  }
}
