import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Page, Shop } from '../models';

@Injectable({ providedIn: 'root' })
export class ShopsService {
  private readonly http = inject(HttpClient);

  list(page = 1, pageSize = 100, q?: string) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (q) params = params.set('q', q);

    return this.http.get<Page<Shop>>('/api/shops', { params });
  }

  get(id: number) {
    return this.http.get<Shop>(`/api/shops/${id}`);
  }

  create(body: { name: string; contactEmail: string }) {
    return this.http.post<Shop>('/api/shops', body);
  }

  update(id: number, body: { name?: string; contactEmail?: string; isActive?: boolean }) {
    return this.http.patch<Shop>(`/api/shops/${id}`, body);
  }

  remove(id: number) {
    return this.http.delete<void>(`/api/shops/${id}`);
  }
}
