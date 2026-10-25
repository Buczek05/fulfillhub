import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

// Dokleja token do każdego żądania, a wygaśnięty token kończy się wylogowaniem.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const authorized =
    token && !request.url.includes('/api/auth/login')
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !request.url.includes('/api/auth/login')) {
        auth.logout();
      }

      return throwError(() => error);
    }),
  );
};
