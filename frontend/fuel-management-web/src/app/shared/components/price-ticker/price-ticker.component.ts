import { Component } from '@angular/core';

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
export class PriceTickerComponent {
  prices: FuelPrice[] = [
    { fuelType: 'Petrol', price: 97.45, delta: 0.35 },
    { fuelType: 'Diesel', price: 89.1, delta: -0.2 },
    { fuelType: 'CNG', price: 78.25, delta: 0 },
    { fuelType: 'Premium Petrol', price: 105.7, delta: 0.45 },
    { fuelType: 'Premium Diesel', price: 96.9, delta: -0.1 },
  ];

  now = new Date();

}
