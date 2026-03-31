import { Component } from '@angular/core';

@Component({
  selector: 'app-receipt-viewer',
  templateUrl: './receipt-viewer.component.html',
  styleUrl: './receipt-viewer.component.scss'
})
export class ReceiptViewerComponent {
  receiptNumber = '';
  result: { station: string; amount: number; date: string } | null = null;

  search(): void {
    if (!this.receiptNumber.trim()) {
      this.result = null;
      return;
    }

    this.result = {
      station: 'MG Road Fuel Hub',
      amount: 1120,
      date: '29 Mar 2026, 09:15',
    };
  }

}
