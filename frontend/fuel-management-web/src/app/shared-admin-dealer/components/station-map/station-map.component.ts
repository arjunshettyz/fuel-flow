import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

interface MapStation {
  name: string;
  city: string;
  stockHealth: 'green' | 'yellow' | 'red' | 'Green' | 'Yellow' | 'Red';
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-station-map',
  templateUrl: './station-map.component.html',
  styleUrl: './station-map.component.scss'
})
export class StationMapComponent implements AfterViewInit, OnDestroy {
  @Input() stationsInput: MapStation[] | null = null;
  private map?: L.Map;
  readonly mapElementId = `station-map-canvas-${Math.random().toString(36).slice(2, 9)}`;

  stations: MapStation[] = [
    { name: 'MG Road Fuel Hub', city: 'Bengaluru', stockHealth: 'green', lat: 12.9742, lng: 77.6063 },
    { name: 'HSR Sector 2', city: 'Bengaluru', stockHealth: 'yellow', lat: 12.9116, lng: 77.6474 },
    { name: 'Koramangala 5th Block', city: 'Bengaluru', stockHealth: 'green', lat: 12.9352, lng: 77.6245 },
    { name: 'Indiranagar 100ft', city: 'Bengaluru', stockHealth: 'red', lat: 12.9784, lng: 77.6408 },
    { name: 'Hebbal Ring Road', city: 'Bengaluru', stockHealth: 'green', lat: 13.0358, lng: 77.597 },
  ];

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    if (this.map) {
      return;
    }

    this.map = L.map(this.mapElementId, {
      center: [12.9716, 77.5946],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    const bounds: L.LatLngTuple[] = [];
    const stations = this.stationsInput?.length ? this.stationsInput : this.stations;
    for (const station of stations) {
      const health = station.stockHealth.toLowerCase() as 'green' | 'yellow' | 'red';
      const icon = L.divIcon({
        className: `stock-marker ${health}`,
        html: '<span></span>',
        iconSize: [14, 14],
      });

      const marker = L.marker([station.lat, station.lng], { icon }).addTo(this.map);
      marker.bindPopup(`<strong>${station.name}</strong><br/>${station.city}<br/>Stock: ${health.toUpperCase()}`);
      bounds.push([station.lat, station.lng]);
    }

    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [24, 24] });
    }
  }

}
