import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { DirectoryService } from '../../../core/services/directory.service';

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
  profileMessage = '';

  profile = {
    fullName: '',
    email: '',
    phone: '',
  };

  constructor(
    private readonly auth: AuthService,
    private readonly directory: DirectoryService,
  ) {
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

  nextPromo(): void {
    this.promoIndex = (this.promoIndex + 1) % this.promotions.length;
  }

  saveProfile(): void {
    const updated = this.auth.updateCurrentUserProfile(this.profile);
    this.profileMessage = updated
      ? 'Profile updated. Role is locked and cannot be changed from customer account.'
      : 'Unable to update profile. Please login again.';
  }

}
