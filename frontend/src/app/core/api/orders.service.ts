import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Order, OrderStatus, OrderSummary, Page } from '../models';

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus | null;
  shopId?: number | null;
  q?: string;
}

export interface NewOrder {
  shopId: number;
  externalRef: string;
  recipientName: string;
  recipientAddress: string;
  recipientEmail?: string | null;
  items: { productId: number; quantity: number }[];
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  list(query: OrderQuery = {}) {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.pageSize) params = params.set('pageSize', query.pageSize);
    if (query.status) params = params.set('status', query.status);
    if (query.shopId) params = params.set('shopId', query.shopId);
    if (query.q) params = params.set('q', query.q);

    return this.http.get<Page<OrderSummary>>('/api/orders', { params });
  }

  get(id: number) {
    return this.http.get<Order>(`/api/orders/${id}`);
  }

  create(body: NewOrder) {
    return this.http.post<Order>('/api/orders', body);
  }

  changeStatus(id: number, status: 'PICKING' | 'PACKED') {
    return this.http.patch<Order>(`/api/orders/${id}/status`, { status });
  }

  ship(id: number, body: { carrier: string; trackingNumber: string }) {
    return this.http.post<Order>(`/api/orders/${id}/ship`, body);
  }

  cancel(id: number) {
    return this.http.post<Order>(`/api/orders/${id}/cancel`, {});
  }
}
