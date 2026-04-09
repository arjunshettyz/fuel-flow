import { Injectable, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly injector: Injector,
    private readonly router: Router,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthEndpoint = req.url.includes('/gateway/auth/');
        if (error.status === 401 && !isAuthEndpoint) {
          this.injector.get(AuthService).clearSession();

          const currentUrl = this.router.url;
          const returnUrl = currentUrl && !currentUrl.startsWith('/auth') ? currentUrl : undefined;
          void this.router.navigate(['/auth/login'], {
            queryParams: returnUrl ? { returnUrl } : undefined,
          });
        }

        const message =
          error.error?.message ||
          error.error?.title ||
          (error.status === 0 ? 'Unable to reach server.' : `Request failed with status ${error.status}`);
        return throwError(() => new Error(message));
      })
    );
  }
}
