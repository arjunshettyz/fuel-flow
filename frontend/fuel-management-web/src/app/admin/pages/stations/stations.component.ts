import { Component } from '@angular/core';
import { DirectoryService, DirectoryStation } from '../../../core/services/directory.service';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrl: './stations.component.scss'
})
export class StationsComponent {
  stations: DirectoryStation[] = [];
  showMap = true;
  adding = false;
  selectedStation: DirectoryStation | null = null;
  private editingStationId: string | null = null;
  stationMessage = '';

  draft = {
    code: '',
    name: '',
    city: '',
    dealerName: '',
    activePumps: 1,
    stockHealth: 'Green' as 'Green' | 'Yellow' | 'Red',
    lat: 12.9716,
    lng: 77.5946,
  };

  constructor(private readonly directory: DirectoryService) {
    this.directory.stations$.subscribe((stations) => {
      this.stations = stations;
    });
  }

  toggleStation(station: DirectoryStation): void {
    this.directory.toggleStation(station.id);
  }

  viewStation(station: DirectoryStation): void {
    this.selectedStation = station;
    this.stationMessage = `Viewing station: ${station.name}`;
    this.showMap = true;
  }

  editStation(station: DirectoryStation): void {
    this.adding = true;
    this.editingStationId = station.id;
    this.selectedStation = station;
    this.stationMessage = `Editing station: ${station.name}`;
    this.draft = {
      code: station.code,
      name: station.name,
      city: station.city,
      dealerName: station.dealerName,
      activePumps: station.activePumps,
      stockHealth: station.stockHealth,
      lat: station.lat,
      lng: station.lng,
    };
  }

  toggleAddStation(): void {
    this.adding = !this.adding;
    if (!this.adding) {
      this.editingStationId = null;
    }
  }

  toggleMapView(): void {
    this.showMap = !this.showMap;
  }

  addStation(): void {
    if (!this.draft.code || !this.draft.name || !this.draft.city || !this.draft.dealerName) {
      return;
    }

    const stationId = this.editingStationId ?? `s-${Date.now()}`;

    this.directory.saveStation({
      id: stationId,
      code: this.draft.code.trim(),
      name: this.draft.name.trim(),
      city: this.draft.city.trim(),
      dealerName: this.draft.dealerName.trim(),
      activePumps: Number(this.draft.activePumps),
      stockHealth: this.draft.stockHealth,
      active: true,
      lat: Number(this.draft.lat),
      lng: Number(this.draft.lng),
    });

    this.adding = false;
    this.editingStationId = null;
    this.stationMessage = 'Station saved.';
    this.draft = {
      code: '',
      name: '',
      city: '',
      dealerName: '',
      activePumps: 1,
      stockHealth: 'Green',
      lat: 12.9716,
      lng: 77.5946,
    };
  }

}
