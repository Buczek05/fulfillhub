import { Routes } from '@angular/router';

import { authGuard, roleGuard } from './core/auth/auth.guard';
import { Shell } from './layout/shell';

// Ścieżki po polsku – UI jest polski. Guardy są wygodą; uprawnień pilnuje backend.
export const routes: Routes = [
  {
    path: 'logowanie',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pulpit' },
      {
        path: 'pulpit',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'produkty',
        loadComponent: () =>
          import('./features/products/product-list').then((m) => m.ProductList),
      },
      {
        path: 'produkty/nowy',
        canActivate: [roleGuard('ADMIN', 'SHOP')],
        loadComponent: () =>
          import('./features/products/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'produkty/:id',
        loadComponent: () =>
          import('./features/products/product-detail').then((m) => m.ProductDetail),
      },
      {
        path: 'produkty/:id/edycja',
        canActivate: [roleGuard('ADMIN', 'SHOP')],
        loadComponent: () =>
          import('./features/products/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'zamowienia',
        loadComponent: () => import('./features/orders/order-list').then((m) => m.OrderList),
      },
      {
        path: 'zamowienia/nowe',
        canActivate: [roleGuard('ADMIN', 'SHOP')],
        loadComponent: () => import('./features/orders/order-create').then((m) => m.OrderCreate),
      },
      {
        path: 'zamowienia/:id',
        loadComponent: () => import('./features/orders/order-detail').then((m) => m.OrderDetail),
      },
      {
        path: 'sklepy',
        loadComponent: () => import('./features/shops/shop-list').then((m) => m.ShopList),
      },
      {
        path: 'uzytkownicy',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/users/user-list').then((m) => m.UserList),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
