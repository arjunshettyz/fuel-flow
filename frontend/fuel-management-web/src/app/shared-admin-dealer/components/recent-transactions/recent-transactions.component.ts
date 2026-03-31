import { Component } from '@angular/core';

interface RecentTx {
  date: string;
  vehicle: string;
  fuelType: string;
  litres: number;
  amount: number;
}

@Component({
  selector: 'app-recent-transactions',
  templateUrl: './recent-transactions.component.html',
  styleUrl: './recent-transactions.component.scss'
})
export class RecentTransactionsComponent {
  rows: RecentTx[] = [
    { date: '29 Mar, 10:22', vehicle: 'KA01AB1234', fuelType: 'Petrol', litres: 14.2, amount: 1375 },
    { date: '29 Mar, 10:14', vehicle: 'KA03CE8890', fuelType: 'Diesel', litres: 30, amount: 2673 },
    { date: '29 Mar, 09:58', vehicle: 'KA05MN0901', fuelType: 'CNG', litres: 9.8, amount: 766 },
    { date: '29 Mar, 09:42', vehicle: 'KA11RQ4512', fuelType: 'Petrol', litres: 6.5, amount: 630 },
  ];

}
