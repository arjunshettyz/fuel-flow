import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginPayload,
  LoginWithOtpPayload,
  OtpPurpose,
  RegisterPayload,
  SendEmailOtpResponse,
  UserProfile,
  UserRole,
  VerifyEmailOtpResponse,
} from '../models/auth.models';
import { DirectoryService } from './directory.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'fuel.token';
  private readonly userKey = 'fuel.user';
  private readonly rememberKey = 'fuel.remember.identifier';
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly userSubject = new BehaviorSubject<UserProfile | null>(this.readUser());
  readonly currentUser$ = this.userSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly directory: DirectoryService,
  ) {
    const user = this.readUser();
    if (user) {
      this.directory.syncSessionUser(user);
    }
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/gateway/auth/login`, {
        email: payload.identifier.trim().toLowerCase(),
        password: payload.password,
      })
      .pipe(tap((response) => this.setSession(response)));
  }

  loginWithOtp(payload: LoginWithOtpPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/gateway/auth/login-with-otp`, {
        email: payload.email.trim().toLowerCase(),
        otp: payload.otp,
      })
      .pipe(tap((response) => this.setSession(response)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/gateway/auth/register`, payload);
  }

  sendEmailOtp(email: string, purpose: OtpPurpose = 'Register'): Observable<SendEmailOtpResponse> {
    return this.http.post<SendEmailOtpResponse>(`${this.baseUrl}/gateway/auth/email-otp/send`, {
      email: email.trim().toLowerCase(),
      purpose,
    });
  }

  verifyEmailOtp(email: string, otp: string, purpose: OtpPurpose = 'Register'): Observable<VerifyEmailOtpResponse> {
    return this.http.post<VerifyEmailOtpResponse>(`${this.baseUrl}/gateway/auth/email-otp/verify`, {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      purpose,
    });
  }

  resetForgotPassword(identifier: string, otp: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/gateway/auth/forgot-password/reset`, {
      identifier: identifier.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword,
    });
  }

  logout(): Observable<void> {
    return this.http.post(`${this.baseUrl}/gateway/auth/logout`, {}).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      tap(() => this.clearSession())
    );
  }

  setSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.userSubject.next(response.user);
    this.directory.syncSessionUser(response.user);
  }

  updateCurrentUserProfile(payload: { fullName: string; email: string; phone: string }): UserProfile | null {
    const current = this.getCurrentUser();
    if (!current) {
      return null;
    }

    const updatedDirectoryUser = this.directory.updateOwnProfile(current.id, payload);
    if (!updatedDirectoryUser) {
      return null;
    }

    const updatedUser: UserProfile = {
      ...current,
      fullName: updatedDirectoryUser.fullName,
      email: updatedDirectoryUser.email,
      phone: updatedDirectoryUser.phone,
    };

    localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
    this.userSubject.next(updatedUser);
    return updatedUser;
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  getToken(): string | null {
    const token = this.getValidTokenFromStorage();
    if (!token && this.userSubject.value) {
      this.userSubject.next(null);
    }
    return token;
  }

  getCurrentUser(): UserProfile | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getValidTokenFromStorage();
  }

  hasRole(requiredRole: string): boolean {
    const role = this.getCurrentUser()?.role;
    return !!role && role.toLowerCase() === requiredRole.toLowerCase();
  }

  routeForRole(role: UserRole): string {
    switch (role) {
      case 'Admin':
        return '/admin/dashboard';
      case 'Dealer':
        return '/dealer/dashboard';
      case 'Customer':
      default:
        return '/customer/dashboard';
    }
  }

  rememberIdentifier(identifier: string): void {
    if (!identifier) {
      localStorage.removeItem(this.rememberKey);
      return;
    }
    localStorage.setItem(this.rememberKey, identifier.trim());
  }

  getRememberedIdentifier(): string {
    return localStorage.getItem(this.rememberKey) ?? '';
  }

  private readUser(): UserProfile | null {
    if (!this.isAuthenticated()) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      return null;
    }

    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  private getValidTokenFromStorage(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }

    if (this.isJwtExpired(token)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      return null;
    }

    return token;
  }

  private isJwtExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    const exp = payload?.exp;

    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
      return true;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds >= exp;
  }

  private decodeJwtPayload(token: string): { exp?: number } | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json) as { exp?: number };
    } catch {
      return null;
    }
  }
}
