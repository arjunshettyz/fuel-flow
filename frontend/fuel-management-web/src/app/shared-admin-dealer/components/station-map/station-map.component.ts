import { Component } from '@angular/core';

interface MapStation {
  name: string;
  city: string;
  stockHealth: 'green' | 'yellow' | 'red';
}

@Component({
  selector: 'app-station-map',
  templateUrl: './station-map.component.html',
  styleUrl: './station-map.component.scss'
})
export class StationMapComponent {
  stations: MapStation[] = [
    { name: 'MG Road Fuel Hub', city: 'Bengaluru', stockHealth: 'green' },
    { name: 'HSR Sector 2', city: 'Bengaluru', stockHealth: 'yellow' },
    { name: 'Koramangala 5th Block', city: 'Bengaluru', stockHealth: 'green' },
    { name: 'Indiranagar 100ft', city: 'Bengaluru', stockHealth: 'red' },
    { name: 'Hebbal Ring Road', city: 'Bengaluru', stockHealth: 'green' },
  ];

}
