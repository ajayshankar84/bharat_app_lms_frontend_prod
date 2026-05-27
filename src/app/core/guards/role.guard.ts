import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const session = inject(SessionService);
  const router = inject(Router);

  const allowedRoles = ((route.data['roles'] as string[]) || []).map((role) =>
    role.toLowerCase(),
  );

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const userRole = (session.getRole() || 'user').toLowerCase();

  if (allowedRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree([session.getDashboardRoute()]);
};
