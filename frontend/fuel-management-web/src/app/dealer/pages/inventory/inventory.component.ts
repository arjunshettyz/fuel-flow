import { Component } from '@angular/core';

interface TankRow {
  fuelType: string;
  currentLevel: number;
  capacity: number;
  updatedAt: string;
}

interface VarianceRow {
  date: string;
  tank: string;
  dipReading: number;
  systemReading: number;
  variance: number;
}

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  tanks: TankRow[] = [
    { fuelType: 'Petrol A', currentLevel: 6800, capacity: 10000, updatedAt: '29 Mar 10:24' },
    { fuelType: 'Diesel B', currentLevel: 1800, capacity: 9000, updatedAt: '29 Mar 10:20' },
    { fuelType: 'Premium C', currentLevel: 2900, capacity: 7000, updatedAt: '29 Mar 10:19' },
  ];

  varianceRows: VarianceRow[] = [
    { date: '29 Mar', tank: 'Petrol A', dipReading: 6780, systemReading: 6800, variance: -20 },
    { date: '28 Mar', tank: 'Diesel B', dipReading: 1855, systemReading: 1820, variance: 35 },
    { date: '27 Mar', tank: 'Premium C', dipReading: 3000, systemReading: 2950, variance: 50 },
  ];

  stockTimeline = [62, 58, 52, 49, 44, 42, 39, 35, 37, 34];

}
