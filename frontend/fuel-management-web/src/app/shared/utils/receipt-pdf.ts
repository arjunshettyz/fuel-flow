import { jsPDF } from 'jspdf';

export interface ReceiptPdfData {
  readonly receiptNumber: string;
  readonly date: string;
  readonly station: string;
  readonly fuelType: string;
  readonly litres: number;
  readonly paymentMethod: string;
  readonly amountInInr: number;
}

const BrandColors = {
  ink: [15, 22, 28] as const,
  muted: [91, 99, 108] as const,
  accent: [24, 184, 176] as const,
  accentDark: [15, 143, 136] as const,
  border: [214, 221, 226] as const,
  backdrop: [238, 243, 246] as const,
  paper: [255, 255, 255] as const,
};

export function downloadReceiptPdf(data: ReceiptPdfData, fileName: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  renderReceiptPdf(doc, data);
  doc.save(fileName);
}

export function renderReceiptPdf(doc: jsPDF, data: ReceiptPdfData): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 42;
  const headerHeight = 92;

  doc.setFillColor(...BrandColors.accent);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setFillColor(...BrandColors.accentDark);
  doc.rect(0, headerHeight - 14, pageWidth, 14, 'F');

  // Brand mark
  doc.setFillColor(...BrandColors.paper);
  doc.roundedRect(marginX, 24, 44, 44, 14, 14, 'F');
  doc.setFillColor(...BrandColors.accent);
  doc.roundedRect(marginX + 10, 34, 24, 24, 10, 10, 'F');

  doc.setTextColor(...BrandColors.paper);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Fuel Flow Receipt', marginX + 62, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Smart fuel management', marginX + 62, 70);

  doc.setTextColor(...BrandColors.ink);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt: ${data.receiptNumber}`, marginX, headerHeight + 36);
  doc.text(`Date: ${data.date}`, marginX, headerHeight + 56);

  const cardY = headerHeight + 76;
  const cardWidth = pageWidth - marginX * 2;
  const cardHeight = 232;

  doc.setDrawColor(...BrandColors.border);
  doc.setFillColor(...BrandColors.paper);
  doc.roundedRect(marginX, cardY, cardWidth, cardHeight, 14, 14, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BrandColors.ink);
  doc.text('Transaction Summary', marginX + 16, cardY + 28);

  const rows: Array<[string, string]> = [
    ['Station', data.station],
    ['Fuel Type', data.fuelType],
    ['Quantity', `${data.litres} L`],
    ['Payment', data.paymentMethod],
    ['Total', `₹${data.amountInInr.toLocaleString('en-IN')}`],
  ];

  let y = cardY + 64;
  const labelX = marginX + 16;
  const valueX = marginX + 198;
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...BrandColors.muted);
    doc.text(label, labelX, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BrandColors.ink);
    doc.text(value, valueX, y);

    y += 30;
  }

  // Support / footer card
  doc.setFillColor(...BrandColors.backdrop);
  doc.roundedRect(marginX, cardY + cardHeight + 18, cardWidth, 92, 12, 12, 'F');
  doc.setTextColor(...BrandColors.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Thank you for choosing Fuel Flow.', marginX + 16, cardY + cardHeight + 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BrandColors.muted);
  doc.text('For support, contact support@fuelflow.me', marginX + 16, cardY + cardHeight + 72);
}
