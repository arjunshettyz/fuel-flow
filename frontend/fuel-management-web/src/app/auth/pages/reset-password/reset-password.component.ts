import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

const resetPasswordMatchValidator = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { mismatch: true };
};

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  resetDone = false;
  isSubmitting = false;
  errorMessage = '';
  infoMessage = '';
  identifier = '';

  readonly form = this.fb.nonNullable.group(
    {
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [resetPasswordMatchValidator] }
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.identifier = (this.route.snapshot.queryParamMap.get('identifier') ?? '').trim().toLowerCase();
  }

  submit(): void {
    this.errorMessage = '';
    this.infoMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.identifier) {
      this.errorMessage = 'Missing email or phone. Start from Forgot Password again.';
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting = true;
    this.auth
      .resetForgotPassword(this.identifier, value.otp, value.password)
      .pipe(
        catchError((error: Error) => {
          this.isSubmitting = false;
          this.errorMessage = error.message || 'Password reset failed.';
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (!response) {
          return;
        }

        this.resetDone = true;
        this.infoMessage = `${response.message} Updates: Identity service users table (password hash).`;
        setTimeout(() => {
          this.router.navigateByUrl('/auth/login');
        }, 1000);
      });
  }

}
