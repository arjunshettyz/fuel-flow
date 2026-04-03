import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subscription, interval } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly lockoutSeconds = environment.lockoutSeconds;

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.pattern(/(^[^\s@]+@[^\s@]+\.[^\s@]+$)|(^[6-9]\d{9}$)/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['Customer', [Validators.required]],
    rememberMe: [true],
  });

  showPassword = false;
  errorMessage = '';
  failureCount = 0;
  lockoutRemaining = 0;

  private lockoutSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const rememberedIdentifier = this.auth.getRememberedIdentifier();
    if (rememberedIdentifier) {
      this.form.patchValue({
        identifier: rememberedIdentifier,
        rememberMe: true,
      });
    }
  }

  ngOnDestroy(): void {
    this.lockoutSub?.unsubscribe();
  }

  get isLockedOut(): boolean {
    return this.lockoutRemaining > 0;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loadSample(role: 'admin' | 'customer' | 'dealer'): void {
    if (role === 'admin') {
      this.form.patchValue({ identifier: 'admin@fuel.local', password: 'Admin@123', role: 'Admin' });
      this.errorMessage = '';
      return;
    }

    if (role === 'dealer') {
      this.form.patchValue({ identifier: 'dealer@fuel.local', password: 'Dealer@123', role: 'Dealer' });
      this.errorMessage = '';
      return;
    }

    this.form.patchValue({ identifier: 'customer@fuel.local', password: 'Customer@123', role: 'Customer' });
    this.errorMessage = '';
  }

  loginWithOtp(): void {
    this.router.navigate(['/auth/otp-verify'], {
      queryParams: {
        identifier: this.form.controls.identifier.value,
        role: this.form.controls.role.value,
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.isLockedOut) {
      this.form.markAllAsTouched();
      return;
    }

    const { identifier, password, rememberMe, role } = this.form.getRawValue();

    if (rememberMe) {
      this.auth.rememberIdentifier(identifier);
    } else {
      this.auth.rememberIdentifier('');
    }

    this.auth
      .login({ identifier, password })
      .pipe(
        catchError((error: any) => {
          this.errorMessage = error?.message || error?.error?.message || 'Invalid credentials';
          this.trackFailure();
          return EMPTY;
        })
      )
      .subscribe((response) => {
        this.errorMessage = '';
        this.failureCount = 0;
        if (response.user.role.toLowerCase() !== role.toLowerCase()) {
          this.auth.clearSession();
          this.errorMessage = `This account is registered as ${response.user.role}. Please login as ${response.user.role}.`;
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || this.auth.routeForRole(response.user.role));
      });
  }

  private trackFailure(): void {
    this.failureCount += 1;
    if (this.failureCount < 5) {
      return;
    }

    this.startLockoutCountdown();
  }

  private startLockoutCountdown(): void {
    this.lockoutSub?.unsubscribe();
    this.lockoutRemaining = this.lockoutSeconds;
    this.lockoutSub = interval(1000).subscribe(() => {
      this.lockoutRemaining -= 1;
      if (this.lockoutRemaining <= 0) {
        this.lockoutSub?.unsubscribe();
        this.failureCount = 0;
      }
    });
  }

}
