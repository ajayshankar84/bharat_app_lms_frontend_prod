import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';
import { tap } from 'rxjs';
import { LMS_AUTH_ENDPOINT } from '../config/api.config';

/**
 * Global interceptor to attach JWT/Session tokens to outgoing HTTP requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  // const otherService = inject(OtherService); // You can inject any other service here

  const token = sessionService.getSessionToken(); // Retrieve the authentication token

  // Define strict public endpoints to avoid partial matches
  const publicEndpoints = [
    `${LMS_AUTH_ENDPOINT}/login`,
    LMS_AUTH_ENDPOINT
  ];

  // Logic: Is this a login/register request?
  const isPublicRequest = publicEndpoints.some(endpoint => req.url === endpoint || req.url.endsWith('/login'));

  // Only attach if token is a valid non-empty string and NOT a public request
  if (token && token !== 'null' && !isPublicRequest) {
    // 1. Passing the token to another service method during the request phase
    // otherService.processActiveToken(token);

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    // 2. Passing a token received from response headers back to a service (e.g. Refresh logic)
    return next(authReq).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const refreshedToken = event.headers.get('X-Refresh-Token');
          if (refreshedToken) {
            sessionService.setSessionToken(refreshedToken); // Call a method on your service
          }
        }
      })
    );
  }
  // If no token is present or the endpoint is public, proceed with the original request
  return next(req);
};