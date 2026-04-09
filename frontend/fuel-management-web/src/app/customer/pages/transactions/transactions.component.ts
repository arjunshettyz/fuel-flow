import { Component } from '@angular/core';
import { jsPDF } from 'jspdf';

interface TransactionRow {
  date: string;
  station: string;
  fuelType: string;
  quantity: number;
  amount: number;
  paymentMethod: string;
  receipt: string;
}

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {
  readonly rows: TransactionRow[] = [
    { date: '2026-03-29', station: 'MG Road Fuel Hub', fuelType: 'Petrol', quantity: 11.5, amount: 1120, paymentMethod: 'UPI', receipt: 'REC-2401' },
    { date: '2026-03-28', station: 'HSR Sector 2', fuelType: 'Diesel', quantity: 20.2, amount: 1860, paymentMethod: 'Card', receipt: 'REC-2392' },
    { date: '2026-03-27', station: 'Indiranagar 100ft', fuelType: 'CNG', quantity: 8.4, amount: 690, paymentMethod: 'Cash', receipt: 'REC-2388' },
    { date: '2026-03-26', station: 'Hebbal Ring Road', fuelType: 'Petrol', quantity: 9.8, amount: 940, paymentMethod: 'UPI', receipt: 'REC-2370' },
    { date: '2026-03-25', station: 'Koramangala 5th', fuelType: 'Premium Petrol', quantity: 21, amount: 2200, paymentMethod: 'Fleet Card', receipt: 'REC-2363' },
    { date: '2026-03-24', station: 'MG Road Fuel Hub', fuelType: 'Diesel', quantity: 16.2, amount: 1410, paymentMethod: 'Card', receipt: 'REC-2350' },
  ];

  filters = {
    fuelType: '',
    station: '',
    sortBy: 'dateDesc',
  };

  page = 1;
  readonly pageSize = 5;

  get filteredRows(): TransactionRow[] {
    const byFilter = this.rows.filter((row) => {
      const fuelMatches = !this.filters.fuelType || row.fuelType === this.filters.fuelType;
      const stationMatches = !this.filters.station || row.station === this.filters.station;
      return fuelMatches && stationMatches;
    });

    const sorted = [...byFilter].sort((a, b) => {
      if (this.filters.sortBy === 'amount') {
        return b.amount - a.amount;
      }
      return b.date.localeCompare(a.date);
    });

    return sorted;
  }

  get pageRows(): TransactionRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalSpent(): number {
    return this.filteredRows.reduce((acc, row) => acc + row.amount, 0);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  nextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  prevPage(): void {
    this.page = Math.max(1, this.page - 1);
  }

  exportCsv(): void {
    const headers = ['Date', 'Station', 'Fuel', 'Quantity', 'Amount', 'Payment', 'Receipt'];
    const lines = this.filteredRows.map((r) => [r.date, r.station, r.fuelType, `${r.quantity}`, `${r.amount}`, r.paymentMethod, r.receipt]);
    const csv = [headers, ...lines]
      .map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    this.downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'transactions.csv');
  }

  exportExcel(): void {
    const rows = this.filteredRows
      .map((r) => `<tr><td>${r.date}</td><td>${r.station}</td><td>${r.fuelType}</td><td>${r.quantity}</td><td>${r.amount}</td><td>${r.paymentMethod}</td><td>${r.receipt}</td></tr>`)
      .join('');
    const html = `<table><tr><th>Date</th><th>Station</th><th>Fuel</th><th>Quantity</th><th>Amount</th><th>Payment</th><th>Receipt</th></tr>${rows}</table>`;
    this.downloadFile(new Blob([html], { type: 'application/vnd.ms-excel' }), 'transactions.xls');
  }

  downloadReceiptPdf(row: TransactionRow): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFillColor(15, 47, 47);
    doc.rect(0, 0, 595, 88, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('FuelFlow Receipt', 42, 56);

    doc.setTextColor(23, 29, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Receipt: ${row.receipt}`, 42, 120);
    doc.text(`Date: ${row.date}`, 42, 140);

    doc.roundedRect(42, 162, 511, 210, 12, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Transaction Summary', 58, 188);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const summary = [
      ['Station', row.station],
      ['Fuel Type', row.fuelType],
      ['Quantity', `${row.quantity} L`],
      ['Payment', row.paymentMethod],
      ['Total', `INR ${row.amount.toLocaleString('en-IN')}`],
    ];

    let y = 218;
    for (const [label, value] of summary) {
      doc.setTextColor(87, 97, 108);
      doc.text(label, 58, y);
      doc.setTextColor(20, 27, 35);
      doc.setFont('helvetica', 'bold');
      doc.text(value, 220, y);
      doc.setFont('helvetica', 'normal');
      y += 30;
    }

    doc.save(`${row.receipt}.pdf`);
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

}
