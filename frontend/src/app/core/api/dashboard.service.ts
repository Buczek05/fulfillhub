import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { DashboardSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  summary() {
    return this.http.get<DashboardSummary>('/api/dashboard/summary');
  }
}
