import { Component } from '@angular/core';

interface RecentTransaction {
  date: string;
  station: string;
  fuel: string;
  amount: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  loyaltyPoints = 3460;
  redemptionValue = 346;

  recentTransactions: RecentTransaction[] = [
    { date: '29 Mar, 09:15', station: 'MG Road Fuel Hub', fuel: 'Petrol', amount: 1120 },
    { date: '28 Mar, 20:47', station: 'HSR Sector 2', fuel: 'Diesel', amount: 1860 },
    { date: '27 Mar, 14:32', station: 'Indiranagar 100ft', fuel: 'CNG', amount: 690 },
    { date: '26 Mar, 10:51', station: 'Hebbal Ring Road', fuel: 'Petrol', amount: 940 },
    { date: '24 Mar, 21:10', station: 'Koramangala 5th', fuel: 'Premium', amount: 2200 },
  ];

  promotions: string[] = [
    'Weekend cashback: 2% back on UPI payments.',
    'Loyalty booster: 1.5x points on Premium fuels this week.',
    'Dealer special: Free windshield cleaning over INR 1500 bills.',
  ];

  promoIndex = 0;

  nextPromo(): void {
    this.promoIndex = (this.promoIndex + 1) % this.promotions.length;
  }

}
