import { Component } from '@angular/core';
import { downloadReceiptPdf } from '../../../shared/utils/receipt-pdf';

@Component({
  selector: 'app-receipt-viewer',
  templateUrl: './receipt-viewer.component.html',
  styleUrl: './receipt-viewer.component.scss'
})
export class ReceiptViewerComponent {
  receiptNumber = '';
  result: { station: string; amount: number; date: string; fuelType: string; litres: number; paymentMethod: string } | null = null;

  search(): void {
    if (!this.receiptNumber.trim()) {
      this.result = null;
      return;
    }

    this.result = {
      station: 'MG Road Fuel Hub',
      amount: 1120,
      date: '29 Mar 2026, 09:15',
      fuelType: 'Petrol',
      litres: 11.5,
      paymentMethod: 'UPI',
    };
  }

  downloadPdf(): void {
    if (!this.result) {
      return;
    }

    downloadReceiptPdf(
      {
        receiptNumber: this.receiptNumber,
        date: this.result.date,
        station: this.result.station,
        fuelType: this.result.fuelType,
        litres: this.result.litres,
        paymentMethod: this.result.paymentMethod,
        amountInInr: this.result.amount,
      },
      `${this.receiptNumber || 'receipt'}.pdf`
    );
  }

}
