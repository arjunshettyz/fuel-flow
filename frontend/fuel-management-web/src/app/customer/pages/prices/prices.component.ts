import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface FuelPriceSnapshotDto {
  fuelType: string;
  pricePerLitre: number;
  updatedAt: string;
}

interface FuelPriceRow {
  fuelType: string;
  current: number;
  deltaFromYesterday: number;
  lastUpdated: string;
}

interface StationPrice {
  station: string;
  petrol: number;
  diesel: number;
  cng: number;
}

@Component({
  selector: 'app-prices',
  templateUrl: './prices.component.html',
  styleUrl: './prices.component.scss'
})
export class PricesComponent implements OnInit {
  rows: FuelPriceRow[] = [
    { fuelType: 'Petrol', current: 97.45, deltaFromYesterday: 0.35, lastUpdated: '29 Mar 10:05' },
    { fuelType: 'Diesel', current: 89.1, deltaFromYesterday: -0.2, lastUpdated: '29 Mar 10:05' },
    { fuelType: 'CNG', current: 78.25, deltaFromYesterday: 0, lastUpdated: '29 Mar 10:05' },
    { fuelType: 'Premium Petrol', current: 105.7, deltaFromYesterday: 0.45, lastUpdated: '29 Mar 10:05' },
    { fuelType: 'Premium Diesel', current: 96.9, deltaFromYesterday: -0.1, lastUpdated: '29 Mar 10:05' },
  ];

  stationSpecificPricing: StationPrice[] = [
    { station: 'MG Road Fuel Hub', petrol: 97.45, diesel: 89.1, cng: 78.25 },
    { station: 'HSR Sector 2', petrol: 97.6, diesel: 89.35, cng: 78.25 },
    { station: 'Indiranagar 100ft', petrol: 97.55, diesel: 89.2, cng: 78.4 },
  ];

  thirtyDayTrend = [96.2, 96.6, 96.5, 96.8, 97.0, 97.1, 97.45];
  dropAlertTarget = 96.5;

  isSubscribing = false;
  subscribeMessage = '';
  subscribeError = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadCurrentPrices();
  }

  subscribePriceDropAlert(): void {
    this.subscribeMessage = '';
    this.subscribeError = '';

    const target = Number(this.dropAlertTarget);
    if (!Number.isFinite(target) || target <= 0) {
      this.subscribeError = 'Enter a valid target price.';
      return;
    }

    this.isSubscribing = true;
    this.http
      .post(`${environment.apiBaseUrl}/gateway/notifications/price-alerts/subscribe`, {
        targetPricePerLitre: target,
        fuelType: 'Petrol',
      })
      .subscribe({
        next: () => {
          this.subscribeMessage = `Subscribed at INR ${target.toFixed(2)} / litre. You'll get a confirmation email (if mail is enabled) and an alert when Petrol drops below your target.`;
          this.isSubscribing = false;
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Subscription failed.';
          this.subscribeError = message;
          this.isSubscribing = false;
        },
      });
  }

  private loadCurrentPrices(): void {
    this.http
      .get<FuelPriceSnapshotDto[]>(`${environment.apiBaseUrl}/gateway/inventory/tanks/prices`)
      .subscribe({
        next: (items) => {
          if (!Array.isArray(items) || items.length === 0) {
            return;
          }

          this.rows = items.map((x) => ({
            fuelType: x.fuelType,
            current: x.pricePerLitre,
            deltaFromYesterday: 0,
            lastUpdated: x.updatedAt ? new Date(x.updatedAt).toLocaleString() : '',
          }));
        },
        error: () => {
          // Keep demo fallback prices if API is unreachable.
        },
      });
  }

}
