import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

import { DashboardService } from '../../core/api/dashboard.service';
import { NotifyService } from '../../core/notify.service';
import { DashboardSummary, ORDER_STATUS_LABELS, OrderStatus } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly notify = inject(NotifyService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statuses: OrderStatus[] = ['NEW', 'PICKING', 'PACKED', 'SHIPPED', 'CANCELLED'];
  readonly columns = ['externalRef', 'recipientName', 'status', 'itemCount', 'createdAt'];

  ngOnInit(): void {
    this.dashboard.summary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: (error) => this.notify.error(error),
    });
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

}
