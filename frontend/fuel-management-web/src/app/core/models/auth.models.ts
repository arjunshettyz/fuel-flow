export type UserRole = 'Customer' | 'Dealer' | 'Admin' | 'Auditor';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string;
  stationId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export type OtpPurpose = 'Register' | 'Login' | 'ForgotPassword';

export interface LoginWithOtpPayload {
  email: string;
  otp: string;
}

export interface SendEmailOtpResponse {
  message: string;
  expiresInSeconds: number;
  devOtpCode?: string | null;
}

export interface VerifyEmailOtpResponse {
  verified: boolean;
  message: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'Customer' | 'Dealer';
  stationId?: string | null;
}
