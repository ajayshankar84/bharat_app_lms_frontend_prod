import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';
import { LMS_AUTH_ENDPOINT } from '../config/api.config';

/**
 * Global interceptor to attach JWT/Session tokens to outgoing HTTP requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
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
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  // If no token is present or the endpoint is public, proceed with the original request
  return next(req);
};