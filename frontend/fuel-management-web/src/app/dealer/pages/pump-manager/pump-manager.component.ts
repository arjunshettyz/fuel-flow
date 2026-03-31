import { Component } from '@angular/core';

interface PumpState {
  code: string;
  fuelType: string;
  status: 'Active' | 'Offline' | 'Maintenance';
}

@Component({
  selector: 'app-pump-manager',
  templateUrl: './pump-manager.component.html',
  styleUrl: './pump-manager.component.scss'
})
export class PumpManagerComponent {
  pumps: PumpState[] = [
    { code: 'P01', fuelType: 'Petrol', status: 'Active' },
    { code: 'P02', fuelType: 'Diesel', status: 'Active' },
    { code: 'P03', fuelType: 'CNG', status: 'Maintenance' },
    { code: 'P04', fuelType: 'Premium', status: 'Offline' },
  ];

  toggleStatus(pump: PumpState): void {
    if (pump.status === 'Active') {
      pump.status = 'Maintenance';
      return;
    }
    if (pump.status === 'Maintenance') {
      pump.status = 'Offline';
      return;
    }
    pump.status = 'Active';
  }

}
