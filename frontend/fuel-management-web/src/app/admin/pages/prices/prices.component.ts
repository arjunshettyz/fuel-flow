import { Component } from '@angular/core';

interface PriceHistoryRow {
  fuelType: string;
  oldPrice: number;
  newPrice: number;
  effectiveAt: string;
  changedBy: string;
}

@Component({
  selector: 'app-prices',
  templateUrl: './prices.component.html',
  styleUrl: './prices.component.scss'
})
export class PricesComponent {
  currentPrices = [
    { fuelType: 'Petrol', price: 97.45, effectiveDate: '29 Mar 2026 06:00' },
    { fuelType: 'Diesel', price: 89.1, effectiveDate: '29 Mar 2026 06:00' },
    { fuelType: 'CNG', price: 78.25, effectiveDate: '29 Mar 2026 06:00' },
    { fuelType: 'Premium Petrol', price: 105.7, effectiveDate: '29 Mar 2026 06:00' },
  ];

  history: PriceHistoryRow[] = [
    { fuelType: 'Petrol', oldPrice: 97.1, newPrice: 97.45, effectiveAt: '29 Mar 2026 06:00', changedBy: 'Admin: Meera' },
    { fuelType: 'Diesel', oldPrice: 89.3, newPrice: 89.1, effectiveAt: '29 Mar 2026 06:00', changedBy: 'Admin: Meera' },
    { fuelType: 'CNG', oldPrice: 78.0, newPrice: 78.25, effectiveAt: '29 Mar 2026 06:00', changedBy: 'Admin: Meera' },
  ];

}
