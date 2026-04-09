import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface FuelPriceSnapshotDto {
  fuelType: string;
  pricePerLitre: number;
  updatedAt: string;
}

interface FuelPrice {
  fuelType: string;
  price: number;
  delta: number;
}

@Component({
  selector: 'app-price-ticker',
  templateUrl: './price-ticker.component.html',
  styleUrl: './price-ticker.component.scss'
})
export class PriceTickerComponent implements OnInit {
  prices: FuelPrice[] = [
    { fuelType: 'Petrol', price: 97.45, delta: 0.35 },
    { fuelType: 'Diesel', price: 89.1, delta: -0.2 },
    { fuelType: 'CNG', price: 78.25, delta: 0 },
    { fuelType: 'Premium Petrol', price: 105.7, delta: 0.45 },
    { fuelType: 'Premium Diesel', price: 96.9, delta: -0.1 },
  ];

  now = new Date();

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get<FuelPriceSnapshotDto[]>(`${environment.apiBaseUrl}/gateway/inventory/tanks/prices`)
      .subscribe({
        next: (items) => {
          if (!Array.isArray(items) || items.length === 0) {
            return;
          }

          this.prices = items.map((x) => ({
            fuelType: x.fuelType,
            price: x.pricePerLitre,
            delta: 0,
          }));
          this.now = new Date();
        },
        error: () => {
          // Keep demo fallback prices if API is unreachable.
        },
      });
  }

}
