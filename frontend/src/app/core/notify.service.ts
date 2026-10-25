import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { apiErrorMessage } from './api/api-error';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 3500, panelClass: 'snack-success' });
  }

  error(error: unknown): void {
    this.snackBar.open(apiErrorMessage(error), 'OK', { duration: 7000, panelClass: 'snack-error' });
  }
}
