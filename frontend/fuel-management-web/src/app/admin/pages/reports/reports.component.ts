import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface PreviewRow {
  station: string;
  fuelType: string;
  litres: number;
  revenue: number;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent {
  previewRows: PreviewRow[] = [
    { station: 'MG Road', fuelType: 'Petrol', litres: 4200, revenue: 409500 },
    { station: 'HSR Sector 2', fuelType: 'Diesel', litres: 3300, revenue: 293800 },
    { station: 'Indiranagar', fuelType: 'CNG', litres: 1500, revenue: 117000 },
  ];

  reportType = 'Sales Summary';

  isWorking = false;
  statusMessage = '';
  errorMessage = '';

  constructor(private readonly http: HttpClient) {}

  scheduleReport(): void {
    this.generateOnly(this.reportType, 'PDF');
  }

  downloadPdf(): void {
    this.generateAndDownload(this.reportType, 'PDF');
  }

  downloadExcel(): void {
    this.generateAndDownload(this.reportType, 'Excel');
  }

  downloadFraudAnalytics(): void {
    this.generateAndDownload('Fraud Analytics', 'PDF');
  }

  private generateOnly(reportType: string, format: 'PDF' | 'Excel'): void {
    this.statusMessage = '';
    this.errorMessage = '';
    this.isWorking = true;

    const title = `${reportType} Report`;
    this.http
      .post<{ id: string; status: string }>(`${environment.apiBaseUrl}/gateway/reporting/generate`, {
        reportType,
        title,
        format,
      })
      .subscribe({
        next: (resp) => {
          this.statusMessage = `Report generated (${resp.status}). Use Download to get the file.`;
          this.isWorking = false;
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'Failed to generate report.';
          this.isWorking = false;
        },
      });
  }

  private generateAndDownload(reportType: string, format: 'PDF' | 'Excel'): void {
    this.statusMessage = '';
    this.errorMessage = '';
    this.isWorking = true;

    const title = `${reportType} Report`;
    this.http
      .post<{ id: string; status: string }>(`${environment.apiBaseUrl}/gateway/reporting/generate`, {
        reportType,
        title,
        format,
      })
      .subscribe({
        next: (resp) => {
          const extension = format === 'Excel' ? 'xlsx' : 'pdf';
          const safeName = reportType.replace(/[^a-z0-9-_]+/gi, '_');
          const fileName = `${safeName}.${extension}`;

          this.http
            .get(`${environment.apiBaseUrl}/gateway/reporting/${resp.id}/download`, {
              responseType: 'blob',
            })
            .subscribe({
              next: (blob) => {
                this.downloadFile(blob, fileName);
                this.statusMessage = `Downloaded ${fileName}`;
                this.isWorking = false;
              },
              error: (error: unknown) => {
                this.errorMessage = error instanceof Error ? error.message : 'Failed to download report.';
                this.isWorking = false;
              },
            });
        },
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'Failed to generate report.';
          this.isWorking = false;
        },
      });
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
