import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnDestroy {
  sent = false;
  sending = false;
  errorMessage = '';
  infoMessage = '';
  resendSecondsLeft = 0;

  private resendTicker?: Subscription;

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sendOtp();
  }

  resendOtp(): void {
    if (this.resendSecondsLeft > 0 || this.sending) {
      return;
    }

    this.sendOtp();
  }

  goToResetPassword(): void {
    const identifier = this.form.controls.identifier.value.trim();
    if (!identifier) {
      return;
    }

    this.router.navigate(['/auth/reset-password'], {
      queryParams: { identifier },
    });
  }

  private sendOtp(): void {
    const identifier = this.form.controls.identifier.value.trim().toLowerCase();
    this.sending = true;
    this.errorMessage = '';
    this.infoMessage = '';

    this.auth
      .sendEmailOtp(identifier, 'ForgotPassword')
      .pipe(
        catchError((error: Error) => {
          this.errorMessage = error.message || 'Unable to send OTP.';
          this.sending = false;
          return of(null);
        })
      )
      .subscribe((response) => {
        this.sending = false;
        if (!response) {
          return;
        }

        this.sent = true;
        this.infoMessage = response.message;
        this.startResendCountdown(120);
      });
  }

  private startResendCountdown(seconds: number): void {
    this.resendTicker?.unsubscribe();
    this.resendSecondsLeft = seconds;

    this.resendTicker = interval(1000).subscribe(() => {
      this.resendSecondsLeft = Math.max(0, this.resendSecondsLeft - 1);
      if (this.resendSecondsLeft === 0) {
        this.resendTicker?.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.resendTicker?.unsubscribe();
  }

}
