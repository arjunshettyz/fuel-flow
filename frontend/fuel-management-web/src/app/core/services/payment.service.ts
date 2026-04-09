import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RazorpayOrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
}

export interface RazorpayVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerifyResponse {
  verified: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  createOrder(payload: RazorpayOrderRequest): Observable<RazorpayOrderResponse> {
    return this.http.post<RazorpayOrderResponse>(`${this.baseUrl}/gateway/payments/create-order`, payload);
  }

  verifyPayment(payload: RazorpayVerifyRequest): Observable<RazorpayVerifyResponse> {
    return this.http.post<RazorpayVerifyResponse>(`${this.baseUrl}/gateway/payments/verify`, payload);
  }
}
