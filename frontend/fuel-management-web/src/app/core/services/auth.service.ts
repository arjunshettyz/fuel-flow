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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'fuel.token';
  private readonly userKey = 'fuel.user';
  private readonly rememberKey = 'fuel.remember.identifier';
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly userSubject = new BehaviorSubject<UserProfile | null>(this.readUser());
  readonly currentUser$ = this.userSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

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
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): UserProfile | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
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
}
