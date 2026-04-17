import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FuelPricesService } from '../../../core/services/fuel-prices.service';

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

  constructor(
    private readonly fuelPrices: FuelPricesService,
    private readonly destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.fuelPrices.ensureLoaded();

    this.fuelPrices.prices$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }

        this.prices = items.map((x) => ({
          fuelType: x.fuelType,
          price: x.pricePerLitre,
          delta: 0,
        }));

        const timestamps = items
          .map((x) => Date.parse(x.updatedAt))
          .filter((t) => Number.isFinite(t));

        this.now = timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
      });
  }

}
