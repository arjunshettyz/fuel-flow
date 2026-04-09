import { Component, OnInit } from '@angular/core';

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
export class PumpManagerComponent implements OnInit {
  private readonly storageKey = 'fuel.dealer.pumps';

  pumps: PumpState[] = [
    { code: 'P01', fuelType: 'Petrol', status: 'Active' },
    { code: 'P02', fuelType: 'Diesel', status: 'Active' },
    { code: 'P03', fuelType: 'CNG', status: 'Maintenance' },
    { code: 'P04', fuelType: 'Premium', status: 'Offline' },
  ];

  ngOnInit(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PumpState[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.pumps = parsed;
      }
    } catch {
      // Ignore corrupted local cache and continue with defaults.
    }
  }

  toggleStatus(pump: PumpState): void {
    if (pump.status === 'Active') {
      pump.status = 'Maintenance';
      this.persist();
      return;
    }
    if (pump.status === 'Maintenance') {
      pump.status = 'Offline';
      this.persist();
      return;
    }
    pump.status = 'Active';
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.pumps));
  }

}
