import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  const withCreds = req.clone({ withCredentials: true });
  if (!token) return next(withCreds);
  return next(withCreds.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
