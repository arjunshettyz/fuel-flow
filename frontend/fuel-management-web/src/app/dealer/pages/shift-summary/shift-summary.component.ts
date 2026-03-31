import { Component } from '@angular/core';

@Component({
  selector: 'app-shift-summary',
  templateUrl: './shift-summary.component.html',
  styleUrl: './shift-summary.component.scss'
})
export class ShiftSummaryComponent {
  totals = {
    litres: 8420,
    revenue: 784300,
    transactions: 412,
    upi: 42,
    card: 31,
    cash: 27,
  };

}
