import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';
import { AuthService } from '../services/auth.service';
import { USERS_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const authService = inject(AuthService);

  const isAuthEndpoint =
    req.url.includes('/user/login-send-otp') ||
    req.url.includes('/user/login-verify-otp');

  const needsToken = req.url.startsWith(USERS_URL) && !isAuthEndpoint;

  let authReq = req;
  if (needsToken) {
    const token = session.getSessionToken();
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && needsToken) {
        authService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    }),
  );
};
