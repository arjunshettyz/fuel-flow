import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SuccessNoteService } from '../services/success-note.service';

@Injectable()
export class SuccessNoteInterceptor implements HttpInterceptor {
  constructor(private readonly successNotes: SuccessNoteService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      tap((event) => {
        if (!(event instanceof HttpResponse)) {
          return;
        }

        if (event.status < 200 || event.status >= 300) {
          return;
        }

        const method = req.method.toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
          return;
        }

        if (this.shouldSkip(req.url)) {
          return;
        }

        this.successNotes.show(this.resolveMessage(method, req.url));
      })
    );
  }

  private shouldSkip(url: string): boolean {
    const normalized = url.toLowerCase();

    if (normalized.includes('/gateway/ai/chat')) {
      return true;
    }

    if (normalized.includes('/gateway/public/contact')) {
      return true;
    }

    return false;
  }

  private resolveMessage(method: string, url: string): string {
    const normalized = url.toLowerCase();

    if (normalized.includes('/gateway/auth/login')) {
      return 'Logged in successfully.';
    }

    if (normalized.includes('/gateway/auth/register')) {
      return 'Registration submitted.';
    }

    if (normalized.includes('/gateway/auth/email-otp/send')) {
      return 'OTP sent successfully.';
    }

    if (normalized.includes('/gateway/auth/forgot-password/reset')) {
      return 'Password reset successfully.';
    }

    switch (method) {
      case 'POST':
        return 'Submitted successfully.';
      case 'PUT':
      case 'PATCH':
        return 'Updated successfully.';
      case 'DELETE':
        return 'Deleted successfully.';
      default:
        return 'Success.';
    }
  }
}
