import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  kpis = [
    { title: 'Active Stations', value: '132', subtitle: 'System-wide', trend: '+3 this month', tone: 'neutral' as const },
    { title: 'Litres Sold Today', value: '1,24,820 L', subtitle: 'All stations', trend: '+8.1%', tone: 'success' as const },
    { title: 'Revenue Today', value: 'INR 11.4 Cr', subtitle: 'All channels', trend: '+7.5%', tone: 'success' as const },
    { title: 'Pending Fraud Alerts', value: '28', subtitle: 'Needs review', trend: '6 high severity', tone: 'danger' as const },
  ];

  topStations = [
    { name: 'MG Road Hub', revenue: 88.2 },
    { name: 'HSR Sector 2', revenue: 76.8 },
    { name: 'Indiranagar 100ft', revenue: 70.4 },
    { name: 'Hebbal Ring Road', revenue: 64.7 },
  ];

  fuelDistribution = [
    { fuel: 'Petrol', share: 46 },
    { fuel: 'Diesel', share: 34 },
    { fuel: 'CNG', share: 14 },
    { fuel: 'Premium', share: 6 },
  ];

  activityFeed = [
    'New replenishment approved for Station KA-12',
    'Price update scheduled for tomorrow 06:00 IST',
    'Fraud alert escalated for transaction TX-81931',
    'Dealer onboarding completed for Station KA-44',
  ];

}
