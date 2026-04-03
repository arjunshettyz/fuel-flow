import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-otp-verify',
  templateUrl: './otp-verify.component.html',
  styleUrl: './otp-verify.component.scss'
})
export class OtpVerifyComponent {
  message = '';
  infoMessage = '';
  otpSent = false;
  isSendingOtp = false;
  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    role: ['Customer', [Validators.required]],
  });

  constructor(
    private readonly fb: FormBuilder,
    route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    const identifier = route.snapshot.queryParamMap.get('identifier') ?? route.snapshot.queryParamMap.get('email') ?? '';
    const email = identifier.includes('@') ? identifier.trim().toLowerCase() : '';
    const role = route.snapshot.queryParamMap.get('role') ?? 'Customer';
    this.form.patchValue({ email, role });
  }

  sendOtp(): void {
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.message = 'Enter a valid email address.';
      return;
    }

    this.isSendingOtp = true;
    this.message = '';
    this.infoMessage = '';

    this.auth
      .sendEmailOtp(this.form.controls.email.value, 'Login')
      .pipe(
        catchError((error: Error) => {
          this.isSendingOtp = false;
          this.message = error.message || 'Unable to send OTP.';
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSendingOtp = false;
        if (!response) {
          return;
        }

        this.otpSent = true;
        this.infoMessage = response.devOtpCode
          ? `${response.message} Dev OTP: ${response.devOtpCode}`
          : response.message;
        if (response.devOtpCode) {
          this.form.controls.otp.setValue(response.devOtpCode);
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, otp, role } = this.form.getRawValue();
    this.isSubmitting = true;
    this.message = '';
    this.infoMessage = '';

    this.auth
      .loginWithOtp({ email, otp })
      .pipe(
        catchError((error: Error) => {
          this.isSubmitting = false;
          this.message = error.message || 'OTP login failed.';
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (!response) {
          return;
        }

        if (response.user.role.toLowerCase() !== role.toLowerCase()) {
          this.auth.clearSession();
          this.message = `This account is registered as ${response.user.role}. Please login as ${response.user.role}.`;
          return;
        }

        this.router.navigateByUrl(this.auth.routeForRole(response.user.role));
      });
  }

}
