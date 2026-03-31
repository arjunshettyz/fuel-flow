import { Component } from '@angular/core';

interface NearbyStation {
  name: string;
  distanceKm: number;
  city: string;
  stockStatus: 'Green' | 'Yellow' | 'Red';
}

@Component({
  selector: 'app-nearby-stations',
  templateUrl: './nearby-stations.component.html',
  styleUrl: './nearby-stations.component.scss'
})
export class NearbyStationsComponent {
  stations: NearbyStation[] = [
    { name: 'MG Road Fuel Hub', distanceKm: 1.2, city: 'Bengaluru', stockStatus: 'Green' },
    { name: 'HSR Sector 2', distanceKm: 2.8, city: 'Bengaluru', stockStatus: 'Yellow' },
    { name: 'Koramangala 5th', distanceKm: 3.1, city: 'Bengaluru', stockStatus: 'Green' },
    { name: 'Indiranagar 100ft', distanceKm: 3.9, city: 'Bengaluru', stockStatus: 'Red' },
    { name: 'Hebbal Ring Road', distanceKm: 5.0, city: 'Bengaluru', stockStatus: 'Green' },
  ];

}
