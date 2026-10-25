import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Page, Product, StockMovement } from '../models';

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  shopId?: number | null;
  lowStock?: boolean;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  list(query: ProductQuery = {}) {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.q) params = params.set('q', query.q);
    if (query.shopId) params = params.set('shopId', query.shopId);
    if (query.lowStock) params = params.set('lowStock', 'true');
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<Page<Product>>('/api/products', { params });
  }

  get(id: number) {
    return this.http.get<Product>(`/api/products/${id}`);
  }

  create(body: {
    shopId: number;
    sku: string;
    name: string;
    ean?: string | null;
    lowStockThreshold?: number;
  }) {
    return this.http.post<Product>('/api/products', body);
  }

  update(
    id: number,
    body: { name?: string; ean?: string | null; lowStockThreshold?: number },
  ) {
    return this.http.patch<Product>(`/api/products/${id}`, body);
  }

  remove(id: number) {
    return this.http.delete<void>(`/api/products/${id}`);
  }

  receive(id: number, body: { quantity: number; reason?: string }) {
    return this.http.post<Product>(`/api/products/${id}/receipts`, body);
  }

  adjust(id: number, body: { newQuantityOnHand: number; reason: string }) {
    return this.http.post<Product>(`/api/products/${id}/adjustments`, body);
  }

  movements(id: number, page = 1, pageSize = 20) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);

    return this.http.get<Page<StockMovement>>(`/api/products/${id}/movements`, { params });
  }
}
