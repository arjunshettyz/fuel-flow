import { Component } from '@angular/core';
import { jsPDF } from 'jspdf';

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

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFillColor(15, 47, 47);
    doc.rect(0, 0, 595, 88, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('FuelFlow Receipt', 42, 56);

    doc.setTextColor(23, 29, 35);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt: ${this.receiptNumber}`, 42, 120);
    doc.text(`Date: ${this.result.date}`, 42, 140);

    doc.setDrawColor(209, 218, 226);
    doc.roundedRect(42, 162, 511, 210, 12, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Transaction Summary', 58, 188);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const rows = [
      ['Station', this.result.station],
      ['Fuel Type', this.result.fuelType],
      ['Quantity', `${this.result.litres} L`],
      ['Payment', this.result.paymentMethod],
      ['Total', `INR ${this.result.amount.toLocaleString('en-IN')}`],
    ];

    let y = 218;
    for (const [label, value] of rows) {
      doc.setTextColor(87, 97, 108);
      doc.text(label, 58, y);
      doc.setTextColor(20, 27, 35);
      doc.setFont('helvetica', 'bold');
      doc.text(value, 220, y);
      doc.setFont('helvetica', 'normal');
      y += 30;
    }

    doc.setFillColor(238, 246, 248);
    doc.roundedRect(42, 392, 511, 92, 10, 10, 'F');
    doc.setTextColor(36, 52, 63);
    doc.text('Thank you for choosing FuelFlow.', 58, 426);
    doc.text('For support, contact support@fuelflow.me', 58, 446);

    doc.save(`${this.receiptNumber || 'receipt'}.pdf`);
  }

}
