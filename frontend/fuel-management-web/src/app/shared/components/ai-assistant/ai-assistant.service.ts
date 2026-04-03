import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface AiAssistantResponse {
  reply?: string;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly assistantUrl = `${environment.apiBaseUrl}/gateway/ai/chat`;
  private readonly fallbackReplies = [
    {
      match: ['pricing', 'tiers', 'plans', 'cost', 'price'],
      reply:
        'Pricing tiers: Essential (₹0, marketplace access + basic reporting), Growth (₹499/mo, AI RFP automation + live pricing index), and Enterprise (custom, integrations + compliance tooling).',
    },
    {
      match: ['track', 'order', 'delivery', 'status'],
      reply:
        'To track an order, open Orders in your dashboard and search by order ID or vendor name. You can also filter by status to see in-transit vs delivered fuel orders.',
    },
    {
      match: ['login', 'sign in', 'password', 'account', 'locked'],
      reply:
        'For login help, use the Forgot Password link on the sign-in page. If your account is locked after multiple attempts, wait a minute and try again or contact support.',
    },
    {
      match: ['support', 'help', 'contact'],
      reply:
        'Support is available 24/7. You can reach the team via the Contact button in the header or by opening a support ticket from your dashboard.',
    },
  ];

  constructor(private readonly http: HttpClient) {}

  sendMessage(message: string): Observable<string> {
    return this.http
      .post<AiAssistantResponse>(this.assistantUrl, { message })
      .pipe(
        map((response) => response.reply ?? 'I was unable to generate a response.'),
        catchError((error: HttpErrorResponse) => {
          const fallback = this.getFallbackReply(message);
          if (fallback) {
            return of(fallback);
          }
          const status = error.status ? ` (status ${error.status})` : '';
          return of(`I had trouble reaching the AI service${status}. Please try again shortly.`);
        })
      );
  }

  private getFallbackReply(message: string): string | null {
    const normalized = message.toLowerCase();
    const match = this.fallbackReplies.find((entry) =>
      entry.match.some((keyword) => normalized.includes(keyword))
    );
    return match?.reply ?? null;
  }
}
