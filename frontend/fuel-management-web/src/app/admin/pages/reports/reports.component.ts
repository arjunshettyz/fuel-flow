import { Component } from '@angular/core';

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

}
