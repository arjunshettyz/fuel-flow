import { Component, OnInit } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterPayload } from '../../../core/models/auth.models';

const passwordMatchValidator = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  otpSent = false;
  otpVerified = false;
  isSendingOtp = false;
  isVerifyingOtp = false;
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      mobileNumber: [
        '',
        [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
        [this.duplicateFieldValidator('phone')],
      ],
      email: ['', [Validators.required, Validators.email], [this.duplicateFieldValidator('email')]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)],
      ],
      confirmPassword: ['', [Validators.required]],
      role: ['Customer', [Validators.required]],
      stationLicenseNumber: [''],
      stationName: [''],
      stationAddress: [''],
      aadhaarLast4: ['', [Validators.pattern(/^\d{4}$/)]],
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      termsAccepted: [false, [Validators.requiredTrue]],
    },
    {
      validators: [passwordMatchValidator],
    }
  );

  constructor(private readonly fb: FormBuilder, private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.applyDealerValidators(false);
    this.form.controls.role.valueChanges.subscribe((role) => {
      this.applyDealerValidators(role === 'Dealer');
    });

    this.form.controls.email.valueChanges.subscribe(() => {
      // OTP must be re-verified whenever email changes.
      this.otpSent = false;
      this.otpVerified = false;
    });
  }

  get aadhaarMask(): string {
    const last4 = this.form.controls.aadhaarLast4.value;
    return last4 ? `XXXX-XXXX-${last4}` : 'XXXX-XXXX-0000';
  }

  sendOtp(): void {
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.submitError = 'Enter a valid email before requesting OTP.';
      return;
    }

    this.isSendingOtp = true;
    this.submitError = '';
    this.submitSuccess = '';

    this.auth
      .sendEmailOtp(this.form.controls.email.value, 'Register')
      .pipe(
        catchError((error: any) => {
          this.submitError = error?.error?.message || 'Unable to send OTP.';
          this.isSendingOtp = false;
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSendingOtp = false;
        if (!response) {
          return;
        }

        this.otpSent = true;
        this.otpVerified = false;
        this.form.controls.otp.setValue(response.devOtpCode ?? '');
        this.submitError = '';
        this.submitSuccess = response.devOtpCode
          ? `${response.message} Dev OTP: ${response.devOtpCode}`
          : response.message;
      });
  }

  verifyOtp(): void {
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.submitError = 'Enter a valid email before OTP verification.';
      return;
    }

    if (this.form.controls.otp.invalid) {
      this.form.controls.otp.markAsTouched();
      this.submitError = 'Enter a valid 6-digit OTP.';
      return;
    }

    this.isVerifyingOtp = true;
    this.submitError = '';
    this.submitSuccess = '';

    this.auth
      .verifyEmailOtp(this.form.controls.email.value, this.form.controls.otp.value, 'Register')
      .pipe(
        catchError((error: any) => {
          this.submitError = error?.error?.message || 'OTP verification failed.';
          this.isVerifyingOtp = false;
          this.otpVerified = false;
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isVerifyingOtp = false;
        if (!response) {
          return;
        }

        this.otpVerified = response.verified;
        if (!response.verified) {
          this.submitError = response.message || 'OTP verification failed.';
          this.submitSuccess = '';
          return;
        }

        this.submitError = '';
        this.submitSuccess = response.message;
      });
  }

  submit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.form.pending) {
      this.submitError = 'Please wait while we validate your details.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError = 'Please fix the highlighted fields and try again.';
      return;
    }

    if (!this.otpSent) {
      this.submitError = 'Send OTP to your email first.';
      return;
    }

    if (!this.otpVerified) {
      this.verifyOtpAndRegister();
      return;
    }

    this.registerAccount();
  }

  private verifyOtpAndRegister(): void {
    if (this.isVerifyingOtp || this.form.controls.email.invalid) {
      return;
    }

    this.isVerifyingOtp = true;
    this.auth
      .verifyEmailOtp(this.form.controls.email.value, this.form.controls.otp.value, 'Register')
      .pipe(
        catchError((error: any) => {
          this.submitError = error?.error?.message || 'OTP verification failed.';
          this.isVerifyingOtp = false;
          this.otpVerified = false;
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isVerifyingOtp = false;
        if (!response || !response.verified) {
          this.submitError = response?.message || this.submitError || 'OTP verification failed.';
          return;
        }

        this.otpVerified = true;
        this.registerAccount();
      });
  }

  private registerAccount(): void {
    this.isSubmitting = true;

    const value = this.form.getRawValue();
    const payload: RegisterPayload = {
      fullName: value.fullName,
      email: value.email,
      password: value.password,
      phone: value.mobileNumber,
      role: value.role === 'Dealer' ? 'Dealer' : 'Customer',
      stationId: null,
    };

    this.auth
      .register(payload)
      .pipe(
        catchError((error: any) => {
          this.submitError = error?.error?.message || 'Unable to create account.';
          this.isSubmitting = false;
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.isSubmitting = false;
        this.persistForDuplicateCheck(value.email, value.mobileNumber);
        this.submitSuccess = 'Registration complete. Redirecting to login...';
        setTimeout(() => this.router.navigateByUrl('/auth/login'), 900);
      });
  }

  private duplicateFieldValidator(kind: 'email' | 'phone'): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return of(this.readRegisteredStore()).pipe(
        delay(300),
        map((store) => {
          const exists = kind === 'email' ? store.emails.includes(control.value) : store.phones.includes(control.value);
          return exists ? { duplicate: true } : null;
        })
      );
    };
  }

  private applyDealerValidators(isDealer: boolean): void {
    const stationLicenseNumber = this.form.controls.stationLicenseNumber;
    const stationName = this.form.controls.stationName;
    const stationAddress = this.form.controls.stationAddress;

    if (isDealer) {
      stationLicenseNumber.setValidators([Validators.required]);
      stationName.setValidators([Validators.required]);
      stationAddress.setValidators([Validators.required]);
    } else {
      stationLicenseNumber.clearValidators();
      stationName.clearValidators();
      stationAddress.clearValidators();
    }

    stationLicenseNumber.updateValueAndValidity();
    stationName.updateValueAndValidity();
    stationAddress.updateValueAndValidity();
  }

  private readRegisteredStore(): { emails: string[]; phones: string[] } {
    const raw = localStorage.getItem('fuel.registered.identity');
    if (!raw) {
      return { emails: [], phones: [] };
    }

    try {
      return JSON.parse(raw) as { emails: string[]; phones: string[] };
    } catch {
      return { emails: [], phones: [] };
    }
  }

  private persistForDuplicateCheck(email: string, phone: string): void {
    const store = this.readRegisteredStore();
    if (!store.emails.includes(email)) {
      store.emails.push(email);
    }
    if (!store.phones.includes(phone)) {
      store.phones.push(phone);
    }
    localStorage.setItem('fuel.registered.identity', JSON.stringify(store));
  }

}
