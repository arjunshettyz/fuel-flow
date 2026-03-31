import { Component } from '@angular/core';

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

}
