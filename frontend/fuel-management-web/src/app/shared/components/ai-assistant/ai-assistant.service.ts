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
      match: ['fuelevent', 'rfp', 'procurement'],
      reply:
        'FuelEvent helps with procurement: open Platform on the landing page, select FuelEvent, then create an RFP, compare supplier offers, and award the best quote.',
    },
    {
      match: ['fuelcontrol', 'inventory', 'pump'],
      reply:
        'FuelControl supports dealer operations: go to Dealer > Inventory to save dip readings and delivery entries, and Dealer > Pumps to cycle and persist pump status.',
    },
    {
      match: ['fueliq', 'fraud', 'analytics', 'report'],
      reply:
        'FuelIQ and FuelIntel provide insights: use Admin > Fraud for anomaly review and Admin > Reports for station-level trends and downloadable summaries.',
    },
    {
      match: ['pdf', 'receipt', 'download'],
      reply:
        'To download a receipt PDF, open Customer > Receipts or Customer > Transactions and click the PDF action for the receipt you want.',
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
        map((response) => {
          const reply = response.reply ?? this.getDefaultFallbackReply();
          if (this.isTransientFailureReply(reply)) {
            return this.getFallbackReply(message) ?? this.getDefaultFallbackReply();
          }
          return reply;
        }),
        catchError((error: HttpErrorResponse) => {
          const fallback = this.getFallbackReply(message);
          if (fallback) {
            return of(fallback);
          }
          return of(this.getDefaultFallbackReply());
        })
      );
  }

  private isTransientFailureReply(reply: string): boolean {
    const normalized = reply.toLowerCase();
    return normalized.includes('trouble reaching the ai service')
      || normalized.includes('status 429')
      || normalized.includes('rate limit');
  }

  private getFallbackReply(message: string): string | null {
    const normalized = message.toLowerCase();
    const match = this.fallbackReplies.find((entry) =>
      entry.match.some((keyword) => normalized.includes(keyword))
    );
    return match?.reply ?? null;
  }

  private getDefaultFallbackReply(): string {
    return 'I can still help right now. Tell me your goal and I will guide you step-by-step across Orders, Pricing, Receipts, Dealer Operations, or Admin actions.';
  }
}
