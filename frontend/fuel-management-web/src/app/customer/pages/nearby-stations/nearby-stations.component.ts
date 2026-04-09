import { Component } from '@angular/core';
import { DirectoryService, DirectoryStation, DirectoryUser } from '../../../core/services/directory.service';

@Component({
  selector: 'app-nearby-stations',
  templateUrl: './nearby-stations.component.html',
  styleUrl: './nearby-stations.component.scss'
})
export class NearbyStationsComponent {
  stations: DirectoryStation[] = [];
  dealerSearch = '';
  dealers: DirectoryUser[] = [];

  constructor(private readonly directory: DirectoryService) {
    this.directory.stations$.subscribe((stations) => {
      this.stations = stations;
    });

    this.directory.users$.subscribe((users) => {
      this.dealers = users.filter((user) => user.role === 'Dealer');
    });
  }

  get filteredDealers(): DirectoryUser[] {
    const q = this.dealerSearch.trim().toLowerCase();
    if (!q) {
      return this.dealers;
    }

    return this.dealers.filter((dealer) =>
      [dealer.fullName, dealer.email, dealer.phone].some((field) => field.toLowerCase().includes(q))
    );
  }

}
