import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { Role } from '../models';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return router.createUrlTree(['/logowanie'], { queryParams: { powrot: state.url } });
};

// Backend i tak pilnuje uprawnień – guard tylko oszczędza użytkownikowi ekranu z błędem 403.
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(...roles)) return true;

    return router.createUrlTree(['/pulpit']);
  };
