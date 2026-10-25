import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Page, Role, User } from '../models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(page = 1, pageSize = 20, role?: Role | null, q?: string) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (role) params = params.set('role', role);
    if (q) params = params.set('q', q);

    return this.http.get<Page<User>>('/api/users', { params });
  }

  create(body: { email: string; password: string; role: Role; shopId?: number | null }) {
    return this.http.post<User>('/api/users', body);
  }

  update(
    id: number,
    body: { email?: string; password?: string; role?: Role; shopId?: number | null; isActive?: boolean },
  ) {
    return this.http.patch<User>(`/api/users/${id}`, body);
  }

  deactivate(id: number) {
    return this.http.delete<void>(`/api/users/${id}`);
  }
}
