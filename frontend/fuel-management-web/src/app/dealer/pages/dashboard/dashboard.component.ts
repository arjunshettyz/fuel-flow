import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService, DirectoryUser } from '../../../core/services/directory.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  kpis = [
    { title: 'Total Litres Sold', value: '8,420 L', subtitle: 'Today', trend: '+6.2%', tone: 'success' as const },
    { title: 'Total Revenue', value: 'INR 7,84,300', subtitle: 'Today', trend: '+4.9%', tone: 'success' as const },
    { title: 'Transactions', value: '412', subtitle: 'Today', trend: '+2.1%', tone: 'neutral' as const },
  ];

  lowStockWarnings = ['Diesel Tank B below 20%', 'Premium Petrol Tank C below threshold'];

  hourlySales = [240, 380, 290, 410, 460, 520, 610, 580];

  pumps = [
    { name: 'Pump 01', status: 'Active' },
    { name: 'Pump 02', status: 'Maintenance' },
    { name: 'Pump 03', status: 'Active' },
    { name: 'Pump 04', status: 'Offline' },
  ];

  customerSearch = '';
  customers: DirectoryUser[] = [];
  profileMessage = '';

  profile = {
    fullName: '',
    email: '',
    phone: '',
  };

  constructor(
    private readonly directory: DirectoryService,
    private readonly auth: AuthService,
  ) {
    this.directory.users$.subscribe((users) => {
      this.customers = users.filter((user) => user.role === 'Customer');
    });

    const current = this.auth.getCurrentUser();
    if (current) {
      this.profile = {
        fullName: current.fullName,
        email: current.email,
        phone: current.phone,
      };
      this.directory.syncSessionUser(current);
    }
  }

  get filteredCustomers(): DirectoryUser[] {
    const q = this.customerSearch.trim().toLowerCase();
    if (!q) {
      return this.customers;
    }

    return this.customers.filter((customer) =>
      [customer.fullName, customer.email, customer.phone].some((field) => field.toLowerCase().includes(q))
    );
  }

  saveProfile(): void {
    const updated = this.auth.updateCurrentUserProfile(this.profile);
    this.profileMessage = updated
      ? 'Profile updated. Role is locked and cannot be changed from dealer account.'
      : 'Unable to update profile. Please login again.';
  }

}
