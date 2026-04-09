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

  dipEntry = {
    tank: 'Petrol A',
    reading: 0,
  };

  deliveryEntry = {
    tankerNumber: '',
    invoiceNumber: '',
    quantity: 0,
  };

  requestEntry = {
    fuelType: 'Petrol',
    quantity: 0,
    urgency: 'Normal',
  };

  formMessage = '';

  saveDipReading(): void {
    if (!this.dipEntry.tank || this.dipEntry.reading <= 0) {
      this.formMessage = 'Enter valid tank and dip reading.';
      return;
    }

    const target = this.tanks.find((t) => t.fuelType === this.dipEntry.tank);
    if (target) {
      target.currentLevel = Math.round(this.dipEntry.reading);
      target.updatedAt = 'Just now';
      this.varianceRows = [
        {
          date: 'Today',
          tank: target.fuelType,
          dipReading: Math.round(this.dipEntry.reading),
          systemReading: target.currentLevel,
          variance: Math.round(this.dipEntry.reading) - target.currentLevel,
        },
        ...this.varianceRows,
      ].slice(0, 8);
    }

    this.formMessage = 'Dip reading saved.';
  }

  recordDelivery(): void {
    if (!this.deliveryEntry.tankerNumber || !this.deliveryEntry.invoiceNumber || this.deliveryEntry.quantity <= 0) {
      this.formMessage = 'Enter tanker number, invoice number and quantity.';
      return;
    }

    this.tanks[0].currentLevel = Math.min(this.tanks[0].capacity, this.tanks[0].currentLevel + this.deliveryEntry.quantity);
    this.tanks[0].updatedAt = 'Just now';
    this.formMessage = 'Delivery recorded successfully.';
  }

  submitRequest(): void {
    if (!this.requestEntry.fuelType || this.requestEntry.quantity <= 0) {
      this.formMessage = 'Enter valid fuel type and quantity.';
      return;
    }

    this.formMessage = `Replenishment request submitted for ${this.requestEntry.quantity} L (${this.requestEntry.urgency}).`;
  }

}
