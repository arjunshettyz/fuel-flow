import { Component } from '@angular/core';

interface StationRow {
  code: string;
  name: string;
  city: string;
  dealer: string;
  activePumps: number;
  stockHealth: string;
  active: boolean;
}

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrl: './stations.component.scss'
})
export class StationsComponent {
  stations: StationRow[] = [
    { code: 'KA-12', name: 'MG Road Fuel Hub', city: 'Bengaluru', dealer: 'Aarav Nair', activePumps: 4, stockHealth: 'Good', active: true },
    { code: 'KA-22', name: 'HSR Sector 2', city: 'Bengaluru', dealer: 'Sneha Pai', activePumps: 3, stockHealth: 'Low', active: true },
    { code: 'KA-08', name: 'Indiranagar 100ft', city: 'Bengaluru', dealer: 'Manoj Rao', activePumps: 5, stockHealth: 'Good', active: false },
  ];

  toggleStation(station: StationRow): void {
    station.active = !station.active;
  }

}
